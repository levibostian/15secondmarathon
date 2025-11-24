import { YouTube, schema_playlistItems_list } from 'https://deno.land/x/youtube@v0.3.0/mod.ts';
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

// We are only needing to fetch public youtube data so false is used for 2nd parameter. 
let yt = new YouTube(Deno.env.get('YOUTUBE_API_KEY')!, false);

interface Video {
  title: string
  videoId: string
  durationSeconds: number
}

interface GetPlaylistItemsResponse {
  nextPageToken?: string
  items: [{
    snippet: {
      title: string
      resourceId: { 
        videoId: string 
      }
    },
    status: {
      privacyStatus: "public" | "private"
    }
  }]
}

const videosInPlaylist: Video[] = []

let moreVideosToLoad = true
let getPlaylistVideosPage: string | undefined = undefined
while (moreVideosToLoad) {
  let requestParams: schema_playlistItems_list = {    
    part: 'snippet,status', // defines how much data you need in the response back. 
    playlistId: 'PLWQchasbE_OS-hfvHUV_atDzRCWgxcndk', // 15 second video playlist ID
    maxResults: 50 // this is the max allowed. we still need paging. 
  }

  if (getPlaylistVideosPage) {
    requestParams.pageToken = getPlaylistVideosPage
  }

  // https://developers.google.com/youtube/v3/docs/playlistItems/list
  const videosChunk: GetPlaylistItemsResponse = await yt.playlistItems_list(requestParams)

  console.log(`get playlist videos chunk ${JSON.stringify(videosChunk)}`)

  videosInPlaylist.push(...videosChunk.items.filter(item => item.status.privacyStatus == "public").map(item => {
    return {
      title: item.snippet.title,
      videoId: item.snippet.resourceId.videoId,
      durationSeconds: 0
    }
  }))

  getPlaylistVideosPage = videosChunk.nextPageToken
  moreVideosToLoad = getPlaylistVideosPage != undefined
}

console.log(videosInPlaylist)

// we need to get the duration of each video. we need to call an endpoint to do that. we can only call the endpoint with 50 results max. So, we need to create chunks of input data. 

interface GetVideosListResponse {
  items: [{
    id: string,
    contentDetails: {
      duration: string
    }
  }]
}

// a list of strings where each string is a comma separated list of video Ids. 
const getVideoIds: string[] = []

const chunkSize = 50;
for (let i = 0; i < videosInPlaylist.length; i += chunkSize) {
    const chunk = videosInPlaylist.slice(i, i + chunkSize);

    let videoIdsListForChunk = chunk.map(item => item.videoId).join(",")

    console.log(`made chunk of video ids:\n${videoIdsListForChunk}\n\n`)

    getVideoIds.push(videoIdsListForChunk)
}


for await (const getVideoIdsChunk of getVideoIds) {
  console.log(`getting details of videos for videos: ${getVideoIdsChunk}`)

  const videoDetailsChunk: GetVideosListResponse = await yt.videos_list({
    part: 'contentDetails',
    id: getVideoIdsChunk,
    maxResults: chunkSize
  })

  videoDetailsChunk.items.forEach(videoDetails => {
    const videoId = videoDetails.id
    const durationInSeconds: number = moment.duration(videoDetails.contentDetails.duration).asSeconds()

    console.log(`found duration (${durationInSeconds}) of video ${videoId}`)

    const videoIndexToAddDurationTo = videosInPlaylist.findIndex(video => video.videoId == videoId)!
    const videoToAddDurationTo = videosInPlaylist[videoIndexToAddDurationTo]
    videoToAddDurationTo!.durationSeconds = durationInSeconds

    videosInPlaylist[videoIndexToAddDurationTo] = videoToAddDurationTo
  })  
}

console.log(videosInPlaylist)


interface DataFileFormat {
  videos: Video[]
  totalSecondsOfAllVideos: number
  // array where each index maps to a second of time. The second of time maps to an index in the 'videos' array.
  // the idea is that you take the time right now, find 'mod' by dividing seconds since 1970 by totalSecondsOfAllVideos, then use the mod against marathonFindOffset to get an offset. 
  // this attempts to make the browser code as easy as possible. 
  marathonFindOffset: {
    videosIndex: number
    secondsOffset: number 
  }[]
}

let totalSecondsOfAllVideos = 0
videosInPlaylist.forEach(video => {
  totalSecondsOfAllVideos += video.durationSeconds
})

const marathonFindOffset: {
  videosIndex: number
  secondsOffset: number 
}[] = []
videosInPlaylist.forEach((video, index) => {
  for (let secondOfVideo = 0; secondOfVideo < video.durationSeconds; secondOfVideo++) {
    marathonFindOffset.push({
      videosIndex: index,
      secondsOffset: secondOfVideo
    })
  }
})

if (marathonFindOffset.length != totalSecondsOfAllVideos) {
  throw Error(`Mistake found. Convenient video offset list is length: ${marathonFindOffset.length} but total number of seconds of video is: ${totalSecondsOfAllVideos}. They should be equal.`)
}

const whatToWriteToFile: DataFileFormat = {
  videos: videosInPlaylist,
  totalSecondsOfAllVideos,
  marathonFindOffset
}
 
Deno.writeTextFileSync("data.json", JSON.stringify(whatToWriteToFile))

console.log('Wrote file to data.json')

// Git operations - commit and push if data.json changed
async function runCommand(cmd: string[]): Promise<{stdout: string, stderr: string, success: boolean}> {
  try {
    const command = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    const stdoutStr = new TextDecoder().decode(stdout);
    const stderrStr = new TextDecoder().decode(stderr);

    return {
      stdout: stdoutStr,
      stderr: stderrStr,
      success: code === 0
    };
  } catch (error) {
    console.error(`Failed to run command: ${cmd.join(' ')}`, error);
    return {
      stdout: "",
      stderr: String(error),
      success: false
    };
  }
}

console.log('\nChecking if data.json changed...');

// Check git status for data.json
const gitStatus = await runCommand(['git', 'status', '--porcelain', 'data.json']);
if (!gitStatus.success) {
  console.error('Failed to check git status:', gitStatus.stderr);
  Deno.exit(1);
}

if (gitStatus.stdout.trim() === '') {
  console.log('No changes to data.json - nothing to commit');
  Deno.exit(0);
}

console.log('data.json has changed, committing and pushing...');

// Add data.json
const gitAdd = await runCommand(['git', 'add', 'data.json']);
if (!gitAdd.success) {
  console.error('Failed to git add:', gitAdd.stderr);
  Deno.exit(1);
}

// Commit
const commitMessage = `Update data.json - ${new Date().toISOString()}`;
const gitCommit = await runCommand(['git', 'commit', '-m', commitMessage]);
if (!gitCommit.success) {
  console.error('Failed to git commit:', gitCommit.stderr);
  Deno.exit(1);
}

console.log('Committed changes:', commitMessage);

// Push to gh-pages branch
const githubToken = Deno.env.get('GITHUB_TOKEN');
if (!githubToken) {
  console.error('GITHUB_TOKEN environment variable is required for pushing');
  Deno.exit(1);
}

// Configure git to use token for authentication
const repoUrl = `https://x-access-token:${githubToken}@github.com/levibostian/15secondmarathon.git`;
const gitPush = await runCommand(['git', 'push', repoUrl, 'HEAD:gh-pages', '--force']);

if (!gitPush.success) {
  console.error('Failed to git push:', gitPush.stderr);
  Deno.exit(1);
}

console.log('Successfully pushed to gh-pages branch');
console.log('Update complete!')
