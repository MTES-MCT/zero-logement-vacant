import createWorkers from '../workers';
import registerEvents from '../events';
import createServer from '../server';

registerEvents();
createWorkers();

createServer().start();
