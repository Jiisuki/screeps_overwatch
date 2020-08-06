module.exports = {
    run: function(creep,targets,sources,containers){

        if (creep.memory.working && creep.carry.energy == 0)
        {
            creep.memory.working = undefined;
            creep.memory.task = undefined;
        }
        if( !creep.memory.working && creep.carry.energy == creep.carryCapacity ){
            creep.memory.working = true;
        }
        
        if (creep.memory.working)
        {
            if (0 < targets.length)
            {
                /* find closest */
                var dist = 10000;
                var tClosest = 0;
                for (var r = 0; r < targets.length; r++)
                {
                    var newDist = creep.pos.getRangeTo(targets[r]);
                    if (newDist < dist)
                    {
                        dist = newDist;
                        tClosest = r;
                    }
                }
                if (creep.Room != targets[tClosest].Room)
                {
                    /* Find way home */
                    var exitDir = creep.Room.findExitTo(targets[tClosest].Room);
                    var exitPos = creep.pos.findClosestByRange(exitDir);
                    creep.moveTo(exitPos);
                }
                else
                {
                    if (creep.build(targets[tClosest]) == ERR_NOT_IN_RANGE)
                    {
                        creep.moveTo(targets[tClosest],{reusePath: 10});
                    }
                    else
                    {
                        creep.say(Math.round((100 * targets[tClosest].progress) / targets[tClosest].progressTotal).toString() + " %");
                    }
                }
            }
            else
            {
                creep.memory.task = undefined;
            }
        }
        else
        {
            if (0 < containers.length)
            {
                /* collect from containers first */
                var dist = 1000;
                var idx = 0;
                for (var i = 0; i < containers.length; i++)
                {
                    var newDist = creep.pos.getRangeTo(containers[i]);
                    if (newDist < dist)
                    {
                        dist = newDist;
                        idx = i;
                    }
                }
                if (creep.withdraw(containers[idx],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                {
                    creep.moveTo(containers[idx],{reusePath: 10});
                }
            }
            else
            {
                var src = sources[creep.memory.src];
                if (creep.harvest(src) == ERR_NOT_IN_RANGE)
                {
                    creep.moveTo(src,{reusePath: 10});
                }
            }
        }
    }
};