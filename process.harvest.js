var _ = require('lodash');

module.exports = {
    run: function(creep, storages, sources, dropped){

        if (creep.memory.working && creep.carry.energy == 0)
        {
            creep.memory.working = undefined;
            creep.memory.task = undefined;
        }
        
        if (!creep.memory.working && creep.carry.energy == creep.carryCapacity)
        {
            creep.memory.working = true;
        }
        
        if (creep.memory.working)
        {
            if (storages.length > 0)
            {
                var dist = 1000;
                var tClosest = 0;
                for( var r = 0; r < storages.length; r++ ){
                    var newDist = creep.pos.getRangeTo(storages[r]);
                    if (newDist < dist)
                    {
                        dist = newDist;
                        tClosest = r;
                    }
                }
                if (creep.transfer(storages[tClosest],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                {
                    creep.moveTo(storages[tClosest],{reusePath: 10});
                }
                else
                {
                    creep.say('Transfer');
                }
            }
            else
            {
                creep.memory.task = undefined;
            }
        }
        else
        {
            if (dropped.length > 0)
            {
                var dist = 1000;
                var closest = 0;
                for (var i = 0; i < dropped.length; i++)
                {
                    var newDist = creep.pos.getRangeTo(dropped[i]);
                    if (newDist < dist)
                    {
                        dist = newDist;
                        closest = i;
                    }
                }
                if (dist > 5)
                {
                    var src = sources[creep.memory.src];
                    if (creep.harvest(src) == ERR_NOT_IN_RANGE)
                    {
                        creep.moveTo(src,{reusePath: 10});
                    }
                }
                else
                {
                    if (creep.pickup(dropped[closest]) == ERR_NOT_IN_RANGE)
                    {
                        creep.moveTo(dropped[closest],{reusePath: 10});
                    }
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