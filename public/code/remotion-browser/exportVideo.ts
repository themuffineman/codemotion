// Renders the title card to an MP4 file inside the browser tab. No server involved.
import {canRenderMediaOnWeb, renderMediaOnWeb} from '@remotion/web-renderer';
import {titleCardComposition, type TitleCardProps} from './TitleCard';

export async function exportVideo(props: TitleCardProps, onProgress: (p: number) => void) {
  // First ask the browser if it can encode this (needs WebCodecs + an H.264 encoder).
  const check = await canRenderMediaOnWeb({
    container: 'mp4',
    width: titleCardComposition.width,
    height: titleCardComposition.height,
    muted: true,
  });
  if (!check.canRender) {
    throw new Error(check.issues.map((issue) => issue.message).join('\n'));
  }

  // Then render every frame and encode it. Same component, same props as the Player.
  const {getBlob} = await renderMediaOnWeb({
    composition: titleCardComposition,
    inputProps: props,
    container: 'mp4',
    muted: true, // no audio in this video, so skip the empty audio track
    licenseKey: 'free-license',
    onProgress: ({progress}) => onProgress(progress),
  });

  // The result is a normal Blob: download it, preview it, or upload it.
  return getBlob();
}
