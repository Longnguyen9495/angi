import account from './account';
import common from './common';
import data from './data';
import domain from './domain';
import farm from './farm';
import journey from './journey';
import reel from './reel';

/* One file per namespace so features can be translated independently. */
const messages = { common, reel, journey, account, data, domain, farm };

export default messages;
