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
        var dist = 10000;
        var idx = 0;
        for( var s = 0; s < roomspawns.length; s++ ){
            var newDist = creep.pos.getRangeTo(roomspawns[s]);
            if( newDist < dist ){
                dist = newDist;
                idx = s;
            }
            creep.memory.path = creep.pos.findPathTo(roomspawns[idx]);
        }
        
        var sp = roomspawns[idx];
        if (undefined == sp)
        {
            console.log("Invalid spawn for recycling!");
            creep.suicide();
        }
        else
        {
            let st = sp.recycleCreep(creep);
            if (ERR_NOT_IN_RANGE == st)
            {
                creep.moveByPath(creep.memory.path);
            }
            else if (OK != st)
            {
                creep.suicide();
                console.log("Error recycling creep, sucicide.");
            }
            else
            {
                //console.log("Recycled creep.");
            }
        }
    }
};