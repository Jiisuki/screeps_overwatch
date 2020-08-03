/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('process.recycle');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(creep,roomspawns){
        /* find closest spawn */
        var dist = 1000;
        var idx = 0;
        for( var s = 0; s < roomspawns.length; s++ ){
            var newDist = creep.pos.getRangeTo(roomspawns[s]);
            if( newDist < dist ){
                dist = newDist;
                idx = s;
            }
            creep.memory.path = creep.pos.findPathTo(roomspawns[idx]);
        }
        if( creep.pos.getRangeTo(roomspawns[idx]) > 1 ){
            creep.moveByPath(creep.memory.path);
        } else {
            //creep.suicide();
            /* something weird happened here.. */
            if( roomspawns[idx].recycleCreep(creep) != OK ){
                creep.suicide();
            }
        }
    }
};