var log = require('./bog.js');

log.info('Something wonderful has happened Your AMIGA is alive !!!');

// enable 'T' and timezone
log.config().includeTimeDesignator = true;
log.config().includeTimeZone = true;

log.info('Something wonderful has happened Your AMIGA is alive !!!');

// get a callback for each message
log.callback(function(o) {
    console.log(o);
});

log.info("This is the", "arguments array");
