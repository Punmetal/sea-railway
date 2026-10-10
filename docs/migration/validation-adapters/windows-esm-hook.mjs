// Optional Windows test-host adapter; never loaded by the game.
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(specifier,context,nextResolve){
  if(/^[A-Za-z]:[\\/]/.test(specifier)) specifier=pathToFileURL(specifier).href;
  return nextResolve(specifier,context);
}});
