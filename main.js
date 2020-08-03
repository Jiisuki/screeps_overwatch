/* the overwatch branch is basically an os that handles everything based on
 * current needs */

var _ = require('lodash');
var roadNetworker = require('fcn.roadNetwork');
var autoExtension = require('fcn.autoExtension');
//var workerProcess = require('process.worker');
var processHarvest = require('process.harvest');
var processUpgrade = require('process.upgrade');
var processBuild = require('process.build');
var processRepair = require('process.repair');
var processDefend = require('process.defend');
var processRecycle = require('process.recycle');
var processRecon = require('process.recon');
var processClaimer = require('process.claimer');
var processSpawnbuilder = require('process.spawnbuilder');

module.exports.loop = function()
{
    for (var i in Game.rooms)
    {
        /* memory for the current room */
        var thisRoom = Game.rooms[i];
        var mem = thisRoom.memory;
        
        mem.tickNow = Game.time;
        
        var roomspawns = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN);
            }
        });
        
        if ((mem.tickNow - mem.tickOld) > 100 || mem.tickOld == undefined)
        {
            mem.tickOld = mem.tickNow;
            mem.performMapping = true;
            
            for (var n in roomspawns)
            {
                roadNetworker.run(roomspawns[n]);   
            }
            mem.roadsNetworked = true;
            console.log("Planned road network.");
        }
        
        /* Check for tier upgrade! */
        if (mem.prevLevel == undefined)
        {
            /* Set to current level. */
            mem.prevLevel = thisRoom.controller.level;
        }
        else if (mem.prevLevel < thisRoom.controller.level)
        {
            console.log("Controller upgraded to level " + thisRoom.controller.level.toString());
            mem.prevLevel = thisRoom.controller.level;
            
            /* Setup new extensions/towers to be built. */
            /* Also, expand road network to existing network. */
            console.log("Defining new extensions around initial spawn..")
            autoExtension.run(thisRoom);
        }
        
        /* get arrays */
        var workers = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                return (creep.memory.role == 'worker');
            }
        });
        var defenders = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                return (creep.memory.role == 'defender');
            }
        });
        var damagedCreeps = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                return (creep.hits < creep.hitsMax);
            }
        });
        var hostiles = thisRoom.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {
                return (creep.owner.username != 'Source Keeper');
            }
        });
        var sites = thisRoom.find(FIND_MY_CONSTRUCTION_SITES);
        var repairs = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                return (structure.hits < structure.hitsMax);
            }
        });
        var roadRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
            if (structure.structureType == STRUCTURE_ROAD)
            {
                return (structure.hits < structure.hitsMax);
            }
        }});
        var wallRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
            if( structure.structureType == STRUCTURE_WALL ){
                return (structure.hits < 1000);
            }
        }});
        var containerRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
            if (structure.structureType == STRUCTURE_CONTAINER)
            {
                return (structure.hits < structure.hitsMax);
            }
        }});
        
        var reservoirs = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN);
            }
        });
        var reservoirsNonFull = _.filter(reservoirs, (structure) => structure.energy < structure.energyCapacity);
        var towerSupply = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                return (structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity);
            }
        });
        var containers = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
        var containersNonEmpty = _.filter(containers, (structure) => structure.store[RESOURCE_ENERGY] > 0);
        var containersNonFull = _.filter(containers, (structure) => structure.store[RESOURCE_ENERGY] < structure.storeCapacity);

        var sources = thisRoom.find(FIND_SOURCES_ACTIVE);
        var dropped = thisRoom.find(FIND_DROPPED_RESOURCES); // find_dropped_energy
        
        /* calculate resource requirements */
        var energyCap = 0; var energyNeed = 0;
        for (var n in reservoirs)
        {
            energyNeed += (reservoirs[n].energyCapacity - reservoirs[n].energy);
            energyCap  += reservoirs[n].energyCapacity;
        }
        var containerCap = 0; var containerNeed = 0;
        for (var n in containers)
        {
            containerNeed += (containers[n].storeCapacity - containers[n].store[RESOURCE_ENERGY]);
            containerCap += containers[n].storeCapacity;
        }
        var towerSupplyCap = 0; var towerSupplyNeed = 0;
        for (var n in towerSupply)
        {
            towerSupplyNeed += (towerSupply[n].energyCapacity - towerSupply[n].energy);
            towerSupplyCap  += towerSupply[n].energyCapacity;
        }
        var sitesProgressMax = 0; var sitesProgressLeft = 0;
        for (var s in sites)
        {
            sitesProgressLeft += (sites[s].progressTotal - sites[s].progress);
            sitesProgressMax += sites[s].progressTotal;
        }
        var repairTotal = 0; var repairLeft = 0;
        for (var r in repairs)
        {
            repairLeft += (repairs[s].hitsMax - repairs[s].hits);
            repairTotal += repairs[s].hitsMax;
        }
        var roadworkTotal = 0; var roadworkLeft = 0;
        for (var r in roadRepairs)
        {
            roadworkLeft += (roadRepairs[r].hitsMax - roadRepairs[r].hits);
            roadworkTotal += roadRepairs[r].hitsMax;
        }
        var wallworkTotal = 0; var wallworkLeft = 0;
        for (var w in wallRepairs)
        {
            wallworkLeft += (1000 - wallRepairs[w].hits);
            wallworkTotal += 1000;
        }
        /* avoid div by zero */
        if( energyCap == 0 ) energyCap = 1;
        if( containerCap == 0 ) containerCap = 1;
        if( towerSupplyCap == 0 ) towerSupplyCap = 1;
        if( sitesProgressMax == 0 ) sitesProgressMax = 1;
        if( repairTotal == 0 ) repairTotal = 1;
        if( roadworkTotal == 0 ) roadworkTotal = 1;
        if( wallworkTotal == 0 ) wallworkTotal = 1;
        
        //console.log('Current energy max: ' + energyCap);
        
        /* general purpose resources */
        mem.availableWorkers = workers.length;
        
        /* get percentage fraction requirements */
        
        /* harvesters dependent on energy emptiness of reservoirs */
        mem.requiredHarvesting = Math.round(100 * (energyNeed / energyCap));
        
        /* room controller upgraders, make sure less upgraders near going to next level is ok?
         * also, make sure we have atleast 1 % workers on it to never downgrade! */
        mem.requiredUpgrading = 0;
        if (thisRoom.controller.my)
        {
            if (thisRoom.controller.progress && thisRoom.controller.progressTotal)
            {
                /* let's say base to 100%, more boost when close to finishing, only base when just completed a level */
                var baseUpgradePercentage = 25;
                mem.requiredUpgrading = baseUpgradePercentage + Math.round((100 - baseUpgradePercentage) * (thisRoom.controller.progress / thisRoom.controller.progressTotal));
                //mem.requiredUpgrading = 100; // blast it!
            }
            /* safeguard.. */
            if (hostiles.length > 0)
            {
                if (thisRoom.controller.safeModeAvailable > 1)
                {
                    if (!thisRoom.controller.safeModeCooldown)
                    {
                        thisRoom.controller.activateSafeMode();
                        Game.notify('Safe mode activated due to hostiles present (at ' + Game.time + ' ticks)!');
                    }
                }
            }
        }
        if (mem.requiredUpgrading <= 0)
        {
            mem.requiredUpgrading = 1;
        }
        mem.requiredContainerHarvesting = Math.round(100 * (containerNeed / containerCap)); // heavy task, not super critical (50% could be okay)
        mem.requiredTowerSupplying = Math.round(100 * (towerSupplyNeed / towerSupplyCap));
        mem.requiredBuilding = Math.round(100 * (sitesProgressLeft / sitesProgressMax));
        mem.requiredRepairing = Math.round(100 * (repairLeft / repairTotal));
        mem.requiredRoadworking = Math.round(100 * (roadworkLeft / roadworkTotal));
        mem.requiredWallworking = Math.round(100 * (wallworkLeft / wallworkTotal));
        
        /* get total percentage of requirements, used for extracting actual number of workers */
        mem.requiredTotal = 
            mem.requiredHarvesting +
            mem.requiredContainerHarvesting +
            mem.requiredTowerSupplying +
            mem.requiredUpgrading +
            mem.requiredBuilding +
            mem.requiredRepairing + 
            mem.requiredRoadworking +
            mem.requiredWallworking;
            
        if (mem.requiredTotal < 100)
        {
            mem.requiredTotal = 100;
        }
        
        /* get actual required workers on specific tasks. say around 8 per role is decent unless hostiles present, then reduce to 4 */
        mem.creepsPerWorkerRole = 4; // basis
        if (false)
        {
            if( thisRoom.controller ){
                if( thisRoom.controller.my )
                {
                    mem.creepsPerWorkerRole = Math.round(2 * thisRoom.controller.level);
                }
            }
        }
        
        if (hostiles.length > 0)
        {
            /* half work force, increased defence force */
            mem.requiredWorkers = Math.round(mem.requiredTotal/100 * (mem.creepsPerWorkerRole/2));
            mem.requiredDefenders = 6;
        }
        else
        {
            mem.requiredWorkers = Math.round(mem.requiredTotal/100 * mem.creepsPerWorkerRole);
            mem.requiredDefenders = 2;
        }
        
        mem.requiredWorkersHarvesting = Math.ceil(mem.requiredHarvesting/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersContainerSupplying = Math.ceil(mem.requiredContainerHarvesting/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersTowerSupplying = Math.ceil(mem.requiredTowerSupplying/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersUpgrading = Math.ceil(mem.requiredUpgrading/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersBuilding = Math.ceil(mem.requiredBuilding/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersRepairing = Math.ceil(mem.requiredRepairing/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersRoadworking = Math.ceil(mem.requiredRoadworking/mem.requiredTotal * mem.availableWorkers);
        mem.requiredWorkersWallworking = Math.ceil(mem.requiredWallworking/mem.requiredTotal * mem.availableWorkers);
        
        /* if required, spawn a recon */
        /* NOTE: THIS BLOCKS CREATION OF OTHER WORKERS UNTIL SPAWNED! */
        /* example call: Game.rooms['E16S48'].memory.spawnRecon = 'E15S48'; */
        if (mem.spawnRecon != undefined)
        {
            var reconBody = [MOVE,ATTACK];
            var reconEnergyCost = 50+80;

            for (var n in roomspawns)
            {
                var s = roomspawns[n];
                
                if (s.canCreateCreep(reconBody,undefined) == OK)
                {
                    s.createCreep(reconBody,undefined,{role:'worker',task:'recon',direction:mem.spawnRecon,originalRoom:thisRoom.name});
                    console.log('===================================');
                    console.log('>>>>>>>> NEW RECON SPAWNED <<<<<<<<');
                    console.log('===================================');
                    mem.spawnRecon = undefined;
                    break;
                }
                else
                {
                    console.log('Until recon spawn: ' + Math.round(100*(energyCap - energyNeed)/reconEnergyCost) + ' %');
                }
            }
        }
        else
        {
            if (mem.spawnClaimer != undefined)
            {
                var claimerBody = [MOVE,CLAIM];
                var claimerEnergyCost = 50+(1*600);
    
                for (var n in roomspawns)
                {
                    var s = roomspawns[n];
                    
                    if (s.canCreateCreep(claimerBody,undefined) == OK)
                    {
                        s.createCreep(claimerBody,undefined,{role:'worker',task:'claimer',direction:mem.spawnClaimer,originalRoom:thisRoom.name});
                        console.log('=====================================');
                        console.log('>>>>>>>> NEW CLAIMER SPAWNED <<<<<<<<');
                        console.log('=====================================');
                        mem.spawnClaimer = undefined;
                        break;
                    }
                    else 
                    {
                        console.log('Until claimer spawn: ' + Math.round(100*(energyCap - energyNeed)/claimerEnergyCost) + ' %');
                    }
                }
            }
            else 
            {
                if (mem.spawnBuilder != undefined)
                {
                    var builderBody = [WORK,CARRY,MOVE,MOVE];
                    var builderEnergyCost = 200;
        
                    for (var n in roomspawns)
                    {
                        var s = roomspawns[n];
                        
                        if (s.canCreateCreep(builderBody,undefined) == OK)
                        {
                            s.createCreep(builderBody,undefined,{role:'worker',task:'spawnbuilder',direction:mem.spawnBuilder,originalRoom:thisRoom.name});
                            console.log('=====================================');
                            console.log('>>>>>>>> NEW BUILDER SPAWNED <<<<<<<<');
                            console.log('=====================================');
                            mem.spawnBuilder = undefined;
                            break;
                        }
                        else 
                        {
                            console.log('Until spawn builder spawn: ' + Math.round(100*(energyCap - energyNeed)/builderEnergyCost) + ' %');
                        }
                    }
                }
                else
                {
                    /* let's create workers based on the current requirements */
                    for (var n in roomspawns)
                    {
                        var s = roomspawns[n];
                        if (mem.availableWorkers < mem.requiredWorkers)
                        {
                            if (s.canCreateCreep([WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],undefined) == OK)
                            {
                                /* even better multipurpose creep */
                                s.createCreep([WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE],undefined,{role:'worker',src:0,task:undefined});
                                console.log('New heavy worker arrives.');
                                break;
                            }
                            else 
                            {
                                if (s.canCreateCreep([WORK,WORK,CARRY,MOVE,MOVE],undefined) == OK)
                                {
                                    /*  */
                                    s.createCreep([WORK,WORK,CARRY,MOVE,MOVE],undefined,{role:'worker',src:0,task:undefined});
                                    console.log('New medium worker arrives.');
                                    break;
                                }
                                else 
                                {
                                    if (s.canCreateCreep([WORK,CARRY,MOVE,MOVE],undefined) == OK)
                                    {
                                        /* we can create a better multipurpose creep */
                                        s.createCreep([WORK,CARRY,MOVE,MOVE],undefined,{role:'worker',src:0,task:undefined});
                                        console.log('New normal worker arrives.');
                                        break;
                                    }
                                    else 
                                    {
                                        /* first few, super simple creeps */
                                        if( s.canCreateCreep([WORK,CARRY,MOVE],undefined) == OK ){
                                            /* let's spawn and break */
                                            s.createCreep([WORK,CARRY,MOVE],undefined,{role:'worker',src:0,task:undefined});
                                            console.log('New superlight worker arrives.');
                                            break;
                                        }
                                    }
                                }
                            }
                        } 
                        else if (mem.defendersAssigned < mem.requiredDefenders)
                        {
                            /* should probably work out better strategy for handling hostile situations */
                            /* currently, allow 2 patrolling defenders, or if hostiles are present spawn as many as possible */
                            /* however, it should only do this in case we have enough workers already.. */
                            /* solution? place spawning code below in separate module (and above) and do it in a better way */
                            /* spawn defenders */
                            if (s.canCreateCreep([TOUGH,TOUGH,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE],undefined) == OK)
                            {
                                s.createCreep([TOUGH,TOUGH,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE],undefined,{role:'defender',src:s.name});
                                console.log('New defender arrives!');
                                break;
                            }
                            else 
                            {
                                if (s.canCreateCreep([TOUGH,TOUGH,ATTACK,ATTACK,MOVE,MOVE],undefined) == OK)
                                {
                                    s.createCreep([TOUGH,TOUGH,ATTACK,ATTACK,MOVE,MOVE],undefined,{role:'defender',src:s.name});
                                    console.log('New defender arrives!');
                                    break;
                                }
                                else 
                                {
                                    if (s.canCreateCreep([TOUGH,TOUGH,RANGED_ATTACK,MOVE],undefined) == OK)
                                    {
                                        s.createCreep([TOUGH,TOUGH,RANGED_ATTACK,MOVE],undefined,{role:'defender',src:s.name});
                                        console.log('New defender arrives!');
                                        break;
                                    }
                                    else 
                                    {
                                        if (s.canCreateCreep([TOUGH,TOUGH,ATTACK,MOVE],undefined) == OK)
                                        {
                                            s.createCreep([TOUGH,TOUGH,ATTACK,MOVE],undefined,{role:'defender',src:s.name});
                                            console.log('New defender arrives!');
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        /* perform creep processes */
        for (var c in workers)
        {
            var worker = workers[c];
            if (worker.memory.task == 'harvest')
            {
                processHarvest.run(worker, reservoirsNonFull.concat(containersNonFull), sources, dropped);
            }
            if (worker.memory.task == 'containersupply')
            {
                processHarvest.run(worker, containersNonFull, sources, dropped);
            }
            if (worker.memory.task == 'towersupply')
            {
                processHarvest.run(worker, towerSupply, sources, dropped);
            }
            if (worker.memory.task == 'upgrade')
            {
                processUpgrade.run(worker, sources, containersNonEmpty);
            }
            if (worker.memory.task == 'build')
            {
                processBuild.run(worker, sites, sources, containersNonEmpty);
            }
            if (worker.memory.task == 'repair')
            {
                processRepair.run(worker, repairs, sources, dropped);
            }
            if (worker.memory.task == 'roadwork')
            {
                processRepair.run(worker, roadRepairs, sources, dropped);
            }
            if (worker.memory.task == 'wallwork')
            {
                processRepair.run(worker, wallRepairs, sources, dropped);
            }
            if (worker.memory.task == 'recycle')
            {
                processRecycle.run(worker, roomspawns);
            }
            if (worker.memory.task == 'recon')
            {
                processRecon.run(worker);
            }
            if (worker.memory.task == 'claimer')
            {
                processClaimer.run(worker);
            }
            if (worker.memory.task == 'spawnbuilder')
            {
                processSpawnbuilder.run(worker);
            }
        }
        
        for (var d in defenders)
        {
            if (defenders[d].memory.task == 'recycle')
            {
                processRecycle.run(defenders[d],roomspawns);
            }
            else 
            {
                if (mem.defendersAssigned >= mem.requiredDefenders)
                {
                    defenders[d].memory.shouldAttack = true;
                }
                processDefend.run(defenders[d]);
            }
        }
        
        /* repurpose every undefined creep */
        mem.workersAssignedHarvesting = (_.filter(workers, (creep) => creep.memory.task == 'harvest')).length;
        mem.workersAssignedContainerSupplying = (_.filter(workers, (creep) => creep.memory.task == 'containersupply')).length;
        mem.workersAssignedTowerSupplying = (_.filter(workers, (creep) => creep.memory.task == 'towersupply')).length;
        mem.workersAssignedUpgrading = (_.filter(workers, (creep) => creep.memory.task == 'upgrade')).length;
        mem.workersAssignedBuilding = (_.filter(workers, (creep) => creep.memory.task == 'build')).length;
        mem.workersAssignedRepairing = (_.filter(workers, (creep) => creep.memory.task == 'repair')).length;
        mem.workersAssignedRoadwork = (_.filter(workers, (creep) => creep.memory.task == 'roadwork')).length;
        mem.workersAssignedWallwork = (_.filter(workers, (creep) => creep.memory.task == 'wallwork')).length;
        mem.workersAssignedRecycling = (_.filter(workers, (creep) => creep.memory.task == 'recycle')).length;
        mem.workersAssignedRecon = (_.filter(workers, (creep) => creep.memory.task == 'recon')).length;
        mem.workersAssignedSpawnbuilding = (_.filter(workers, (creep) => creep.memory.task == 'spawnbuilder')).length;
        
        mem.defendersAssigned = defenders.length;
        
        var numSources = sources.length;
        var srcIndex = 0;
        for (var c in workers)
        {
            var worker = workers[c];
            if (worker.memory.task == undefined)
            {
                mem.reassignmentOccured = true;
                /* check recycling ticks, under 150 it may probably do no good? */
                if (worker.ticksToLive < 150)
                {
                    worker.memory.task = 'recycle';
                    worker.say('Recycle');
                    console.log(worker.name+' destined for recycling.');
                    mem.workersAssignedRecycling = (_.filter(workers, (creep) => creep.memory.task == 'recycle')).length;
                }
                else 
                {
                    if (mem.workersAssignedHarvesting < mem.requiredWorkersHarvesting)
                    {
                        /* fill harvesters first */
                        worker.memory.task = 'harvest';
                        worker.say('Harvest');
                        mem.workersAssignedHarvesting = (_.filter(workers, (creep) => creep.memory.task == 'harvest')).length;
                        console.log(worker.name+' assigned to harvesting. Total '+mem.requiredWorkersHarvesting+' harvesters.');
                    }
                    else 
                    {
                        if (mem.workersAssignedUpgrading < mem.requiredWorkersUpgrading)
                        {
                            /* then upgraders */
                            worker.memory.task = 'upgrade';
                            //worker.say('Upgrade');
                            mem.workersAssignedUpgrading = (_.filter(workers, (creep) => creep.memory.task == 'upgrade')).length;
                            console.log(worker.name+' assigned to upgrading. Total '+mem.requiredWorkersUpgrading+' upgraders.');
                        }
                        else 
                        {
                            if (mem.workersAssignedTowerSupplying < mem.requiredWorkersTowerSupplying)
                            {
                                /* fill tower suppliers, critical for defence */
                                worker.memory.task = 'towersupply';
                                worker.say('Tower');
                                mem.workersAssignedTowerSupplying = (_.filter(workers, (creep) => creep.memory.task == 'towersupply')).length;
                                console.log(worker.name+' assigned to tower supplying. Total '+mem.requiredWorkersTowerSupplying+' tower suppliers.');
                            }
                            else 
                            {
                                if (mem.workersAssignedBuilding < mem.requiredWorkersBuilding)
                                {
                                    /* then builders */
                                    worker.memory.task = 'build';
                                    worker.say('Build');
                                    mem.workersAssignedBuilding = (_.filter(workers, (creep) => creep.memory.task == 'build')).length;
                                    console.log(worker.name+' assigned to building. Total '+mem.requiredWorkersBuilding+' builders.');
                                }
                                else 
                                {
                                    if (mem.workersAssignedRepairing < mem.requiredWorkersRepairing)
                                    {
                                        /* then repairers */
                                        worker.memory.task = 'repair';
                                        worker.say('Repair');
                                        mem.workersAssignedRepairing = (_.filter(workers, (creep) => creep.memory.task == 'repair')).length;
                                        console.log(worker.name+' assigned to repairing. Total '+mem.requiredWorkersRepairing+' repairers.');
                                    }
                                    else 
                                    {
                                        if (mem.workersAssignedContainerSupplying < mem.requiredWorkersContainerSupplying)
                                        {
                                            /* fill container suppliers, critical for building and upgrading efficiency */
                                            worker.memory.task = 'containersupply';
                                            worker.say('Container');
                                            mem.workersAssignedContainerSupplying = (_.filter(workers, (creep) => creep.memory.task == 'containersupply')).length;
                                            console.log(worker.name+' assigned to container supplying. Total '+mem.requiredWorkersContainerSupplying+' container suppliers.');
                                        }
                                        else 
                                        {
                                            if (mem.workersAssignedRoadwork < mem.requiredWorkersRoadworking)
                                            {
                                                /* then roadworkers */
                                                worker.memory.task = 'roadwork';
                                                worker.say('Road');
                                                mem.workersAssignedRoadwork = (_.filter(workers, (creep) => creep.memory.task == 'roadwork')).length;
                                                console.log(worker.name+' assigned to roadworking. Total '+mem.requiredWorkersRoadworking+' roadworkers.');
                                            }
                                            else 
                                            {
                                                if (mem.workersAssignedWallwork < mem.requiredWallworking)
                                                {
                                                    /* then wallworkers */
                                                    worker.memory.task = 'wallwork';
                                                    worker.say('Wall');
                                                    mem.workersAssignedWallwork = (_.filter(workers, (creep) => creep.memory.task == 'wallwork')).length;
                                                    console.log(worker.name+' assigned to wallworking. Total '+mem.requiredWorkersWallworking+' wallworkers.');
                                                }
                                                else 
                                                {
                                                    /* if we got here, we have overflow of workers.. just recycle, can be in handy if hostiles appear to get extra energy? */
                                                    /*worker.memory.task = 'recycle';
                                                    worker.say('⟲');
                                                    mem.workersAssignedRecycling = (_.filter(workers, (creep) => creep.memory.task == 'recycle')).length;
                                                    console.log(worker.name+' destined for recycling.');*/
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            /* assign harvest source */
            worker.memory.src = srcIndex;
            srcIndex++;
            if (srcIndex == 2) // source keeper [sim]
                srcIndex++;
            if (srcIndex >= numSources)
                srcIndex = 0;
        }
        
        if (mem.reassignmentOccured == true && mem.performMapping == true)
        {
            if (false)
            {
            /* show current workforce */
            console.log('WORKFORCE DISTRIBUTION UPDATE (LAST TICK ' + Game.time + ' / room: ' + thisRoom.name + '):');
            console.log('  HARVEST:      ' + mem.workersAssignedHarvesting + ' / ' + mem.requiredWorkersHarvesting);
            console.log('  UPGRADE:      ' + mem.workersAssignedUpgrading + ' / ' + mem.requiredWorkersUpgrading);
            console.log('  TOWER SUPPLY: ' + mem.workersAssignedTowerSupplying + ' / ' + mem.requiredWorkersTowerSupplying);
            console.log('  BUILD:        ' + mem.workersAssignedBuilding + ' / ' + mem.requiredWorkersBuilding);
            console.log('  REPAIR:       ' + mem.workersAssignedRepairing + ' / ' + mem.requiredWorkersRepairing);
            console.log('  CONTAINERS:   ' + mem.workersAssignedContainerSupplying + ' / ' + mem.requiredWorkersContainerSupplying);
            console.log('  ROADWORK:     ' + mem.workersAssignedRoadwork + ' / ' + mem.requiredWorkersRoadworking);
            console.log('  WALLWORK:     ' + mem.workersAssignedWallwork + ' / ' + mem.requiredWorkersWallworking);
            console.log('  RECON/CAPT.:  ' + mem.workersAssignedRecon);
            console.log('  SPAWNBUILD:   ' + mem.workersAssignedSpawnbuilding);
            console.log('  DEFEND:       ' + mem.defendersAssigned);
            console.log('  RECYCLE:      ' + mem.workersAssignedRecycling);
            console.log('  TOTAL FORCE:  ' + mem.availableWorkers + ' / ' + mem.requiredWorkers);
            }
            console.log('Reassignment has been made.');
            mem.reassignmentOccured = false;
        }
        
        /* towers */
        var towers = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_TOWER});
        for (var t in towers)
        {
            var thisTower = towers[t];
            if (hostiles.length > 0)
            {
                thisTower.attack(hostiles[0]);
            }
            else if (thisTower.energy > (thisTower.energyCapacity / 2))
            {
                /* only if 50% energy is spared */
                /* heal */
                if (damagedCreeps.length > 0)
                {
                    thisTower.heal(damagedCreeps[0]);
                }
                else 
                {
                    /* repairs? */
                    if (repairs.length > 0)
                    {
                        thisTower.repair(repairs[0]);
                    }
                    else 
                    {
                        if (containerRepairs.length > 0)
                        {
                            thisTower.repair(containerRepairs[0]);
                        }
                        else 
                        {
                            if (roadRepairs.length > 0)
                            {
                                thisTower.repair(roadRepairs[0]);
                            }
                            else 
                            {
                                if (wallRepairs.length > 0)
                                {
                                    thisTower.repair(wallRepairs[0]);
                                }
                            }
                        }
                    }
                }
            }
        }
    
        /* clear memory of dead creeps */
        for (var name in Memory.creeps)
        {
            if (!Game.creeps[name])
            {
                delete Memory.creeps[name];
                console.log('Recycled ' + name +'.');
            }
        }
        
        mem.performMapping = false;
        
    }
    
}
