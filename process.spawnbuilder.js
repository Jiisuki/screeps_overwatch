module.exports = {
    run: function(creep){
        if( creep.room.name == creep.memory.direction ){
            /* we found the room! */
            /* observe only, yeah right.. */
            creep.memory.originalRoom = creep.room.name;
            
            if( creep.memory.working && creep.carry.energy == 0 ){
                creep.memory.working = undefined;
            }
            if( !creep.memory.working && creep.carry.energy == creep.carryCapacity ){
                creep.memory.working = true;
            }
            
            if( creep.memory.working ){
                
                var targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
                
                if( targets.length > 0 ){
                    /* find closest */
                    var dist = 1000;
                    var tClosest = 0;
                    for( var r = 0; r < targets.length; r++ ){
                        var newDist = creep.pos.getRangeTo(targets[r]);
                        if( newDist < dist ){
                            dist = newDist;
                            tClosest = r;
                        }
                    }
                    if( creep.build(targets[tClosest]) == ERR_NOT_IN_RANGE ){
                        creep.moveTo(targets[tClosest],{reusePath: 10});
                    }
                    
                } else {
                    creep.memory.task = undefined;
                }
                
            } else {
                var sources = creep.room.find(FIND_SOURCES);
                if( sources.length > 0 ){
                    var dist = 1000;
                    var idx = 0;
                    for( var i = 0; i < sources.length; i++ ){
                        var newDist = creep.pos.getRangeTo(sources[i]);
                        if( newDist < dist ){
                            dist = newDist;
                            idx = i;
                        }
                    }
                }
                if( creep.harvest(sources[idx]) == ERR_NOT_IN_RANGE ){
                    creep.moveTo(sources[idx],{reusePath: 10});
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