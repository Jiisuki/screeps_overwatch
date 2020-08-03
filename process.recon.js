/* requirements for recon:
 * memory.direction = 'n' (or 's', 'e' or 'w')
 * memory.role = 'worker'
 * memory.task = 'recon'*/
module.exports = {
    run: function(creep){
        if( creep.room.name == creep.memory.direction ){
            /* we found the room! */
            /* observe only, yeah right.. */
            creep.memory.originalRoom = creep.room.name;
            var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            if( hostiles.length > 0 ){
                var dist = 1000;
                var idx = 0;
                for( var r = 0; r < hostiles.length; r++ ){
                    var newDist = creep.pos.getRangeTo(hostiles[r]);
                    if( newDist < dist ){
                        dist = newDist;
                        idx = r;
                    }
                }
                if( creep.attack(hostiles[idx]) == ERR_NOT_IN_RANGE ){
                    creep.moveTo(hostiles[idx],{reusePath:5});
                }
            } else {
                var hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES);
                if( hostileStructures.length > 0 ){
                    var dist = 1000;
                    var idx = 0;
                    for( var r = 0; r < hostileStructures.length; r++ ){
                        var newDist = creep.pos.getRangeTo(hostileStructures[r]);
                        if( newDist < dist ){
                            dist = newDist;
                            idx = r;
                        }
                    }
                    if( creep.attack(hostileStructures[idx]) == ERR_NOT_IN_RANGE ){
                        creep.moveTo(hostileStructures[idx],{reusePath:5});
                    }
                } else {
                    creep.moveTo(24,24,{noPathFinding:true});
                }
            }
        } else {
            /* go towards the exit */
            if( !creep.memory.path ){
                var exitDir = creep.room.findExitTo(creep.memory.direction);
                var exitPos = creep.pos.findClosestByPath(exitDir);
                creep.memory.path = creep.pos.findPathTo(exitPos);
            } else {
                creep.moveByPath(creep.memory.path);
            }
        }
    }
};