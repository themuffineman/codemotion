// The composition: which component to render, plus its size, frame rate and length.
// The Player (preview) and renderMediaOnWeb (export) both read this one object.
import {TitleCard, type TitleCardProps} from './TitleCard';

export const titleCardComposition = {
  id: 'TitleCard',
  component: TitleCard,
  width: 1080,
  height: 1080,
  fps: 30,
  durationInFrames: 120,
  defaultProps: {
    title: 'Rendered in the browser',
    subtitle: 'Exported straight from this tab',
    color: '#6d5efc',
  } satisfies TitleCardProps as TitleCardProps,
};
