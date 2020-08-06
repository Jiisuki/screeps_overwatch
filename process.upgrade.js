module.exports = {
    run: function(creep, sources, containers)
    {
        if (creep.memory.upgrading && creep.carry.energy == 0)
        {
            creep.memory.upgrading = undefined;
            creep.memory.task = undefined;
            creep.say(Math.round((creep.room.controller.progress * 100) / creep.room.controller.progressTotal).toString() + ' %');
        }
        
        if (!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity)
        {
            creep.memory.upgrading = true;
        }
        
        if (creep.memory.upgrading)
        {
            if (creep.room.controller && creep.room.controller.my)
            {
                var s = creep.upgradeController(creep.room.controller);
                if (s == ERR_NOT_IN_RANGE)
                {
                    
                    creep.moveTo(creep.room.controller);
                }
            }
            else
            {
                /* Find way home.. */
                var exitDir = creep.room.findExitTo(Game.spawns["Spawn1"].room);
                var exitPos = creep.pos.findClosestByRange(exitDir);
                creep.moveTo(exitPos);
                //creep.memory.task = undefined;
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