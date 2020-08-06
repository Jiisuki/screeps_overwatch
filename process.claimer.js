/* requirements for recon:
 * memory.direction = 'n' (or 's', 'e' or 'w')
 * memory.role = 'worker'
 * memory.task = 'recon'*/
module.exports = {
    run: function(creep){
        if( creep.room.name == creep.memory.direction ){
            /* we found the room! */
            if( creep.room.controller ){
                /* get current number of owned rooms */
                var ownedControllers = 0;
                for( var n in Game.rooms ){
                    if( Game.rooms[n].controller.my ){
                        ownedControllers++;
                    }
                }
                if( Game.gcl.level > ownedControllers ){
                    if( creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE ){
                        creep.moveTo(creep.room.controller, {reusePath: 5});
                    }
                } else {
                    if( creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE ){
                        creep.moveTo(creep.room.controller, {reusePath: 5});
                    }
                }
            } else {
                /* if the new room doesn't have a controller, move on */
                console.log('RECON: AT '+creep.room.name+', NO CONTROLLER! REQUEST NEW ROOM!');
                creep.memory.originalRoom = creep.room.name;
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