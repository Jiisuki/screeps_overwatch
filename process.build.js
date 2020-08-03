module.exports = {
    run: function(creep,targets,sources,containers){

        if( creep.memory.working && creep.carry.energy == 0 ){
            creep.memory.working = undefined;
            creep.memory.task = undefined;
        }
        if( !creep.memory.working && creep.carry.energy == creep.carryCapacity ){
            creep.memory.working = true;
        }
        
        if( creep.memory.working ){
            
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
                else
                {
                    creep.say(Math.round((100 * targets[tClosest].progress) / targets[tClosest].progressTotal).toString() + " %");
                }
            } else {
                creep.memory.task = undefined;
            }
            
        } else {
            if( containers.length > 0 ){
                /* collect from containers first */
                var dist = 1000;
                var idx = 0;
                for( var i = 0; i < containers.length; i++ ){
                    var newDist = creep.pos.getRangeTo(containers[i]);
                    if( newDist < dist ){
                        dist = newDist;
                        idx = i;
                    }
                }
                if( creep.withdraw(containers[idx],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE ){
                    creep.moveTo(containers[idx],{reusePath: 10});
                }
            } else {
                var src = sources[creep.memory.src];
                if( creep.harvest(src) == ERR_NOT_IN_RANGE ){
                    creep.moveTo(src,{reusePath: 10});
                }
            }
        }
    }
};