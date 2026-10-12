import {makeProject} from '@motion-canvas/core';

import intro from './scenes/intro?scene';
import tutorial from './scenes/tutorial?scene';

export default makeProject({
  scenes: [intro, tutorial],
});
