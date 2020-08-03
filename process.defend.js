/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('process.defend');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(creep){
        if( creep.ticksToLive < 150 ){
            creep.memory.task = 'recycle';
            creep.say('Retiring');
            console.log(creep.name+' destined for recycling (defender).');
            return;
        }
        /* find hostiles */
        var hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        
        if( hostiles.length > 0 && creep.memory.shouldAttack ){
            /* hostiles found, get the closest */
            var dist = 1000;
            var closest = 0;
            for( var i = 0; i < hostiles.length; i++ ){
                var newDist = creep.pos.getRangeTo(hostiles[i]);
                if( newDist < dist ){
                    dist = newDist;
                    closest = i;
                }
            }
            if( creep.attack(hostiles[closest]) == ERR_NOT_IN_RANGE ){
                creep.moveTo(hostiles[closest],{reusePath: 5});
            }
            if( creep.rangedAttack(hostiles[closest]) == ERR_NOT_IN_RANGE ){
                creep.moveTo(hostiles[closest],{reusePath: 5});
            }
        } else {
            /* just send out on patrol .. */
            var patrolTime = 20;
            /* a pre-defined time has elapsed since last patrol route,
               let's define a new target position */
            if( (Game.time - creep.memory.timeOld) > patrolTime || creep.memory.timeOld == undefined ){
                creep.say('Patrol');
                creep.memory.timeOld = Game.time;
                var spawnPosition = Game.spawns[creep.memory.src].pos;
                /* get random angle, then set xy from room centre */
                var rAng = Math.random() * (2*Math.PI);
                var X = spawnPosition.x;
                var Y = spawnPosition.y;
                var D = 8;
                creep.memory.patrolX = Math.round(Math.cos(rAng) * D + X);
                creep.memory.patrolY = Math.round(Math.sin(rAng) * D + Y);
                if( creep.memory.patrolX < 1  ){ creep.memory.patrolX = 1;  }
                if( creep.memory.patrolX > 48 ){ creep.memory.patrolX = 48; }
                if( creep.memory.patrolY < 1  ){ creep.memory.patrolY = 1;  }
                if( creep.memory.patrolY > 48 ){ creep.memory.patrolY = 48; }
                
                /* find path to this position, we want to reuse it for a while to save on CPU */
                creep.memory.path = creep.pos.findPathTo(creep.memory.patrolX,creep.memory.patrolY);
            }
            /* move towards the target location */
            if( creep.pos.getRangeTo(creep.memory.patrolX, creep.memory.patrolY) > 0 ){
                creep.moveByPath(creep.memory.path);
            }
        }
    }
};