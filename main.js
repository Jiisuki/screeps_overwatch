/* the overwatch branch is basically an os that handles everything based on
 * current needs */

/* TODO:
 * 1. Fix lost creeps, they must be able to find home to spawn..
 * 2. Cleanup combined roles.
*/

var _ = require('lodash');
var roadNetworker = require('fcn.roadNetwork');
var autoExtension = require('fcn.autoExtension');
var processHarvest = require('process.harvest');
var processUpgrade = require('process.upgrade');
var processBuild = require('process.build');
var processRepair = require('process.repair');
var processDefend = require('process.defend');
var processRecycle = require('process.recycle');
var processRecon = require('process.recon');
var processClaimer = require('process.claimer');
var processSpawnbuilder = require('process.spawnbuilder');

const ROLES = {
    WORKER: "worker",
    DEFENDER: "defender"
}

const TASKS = {
    HARVEST: "harvest",
    CONTAINER: "containersupply",
    TOWER: "towersupply",
    UPGRADE: "upgrade",
    BUILD:   "build",
    REPAIR:  "repair",
    ROADWORK: "roadwork",
    WALLWORK: "wallwork",
    RECYCLE: "recycle",
    RECON: "recon",
    CLAIM: "claimer",
    SPAWNBUILD: "spawnbuilder",
    DEFEND:  "defend",
}

module.exports.loop = function()
{
    for (let i in Game.rooms)
    {
        /* memory for the current room */
        let thisRoom = Game.rooms[i];
        let mem = thisRoom.memory;

        /* Check if the room is under our control. */
        if (true != thisRoom.controller.my)
        {
            delete Memory.rooms[thisRoom.name];
            console.log("Deleted " + thisRoom.name + " memory data.");
        }
        else
        {
            let tickNow = Game.time;

            let roomspawns = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                    return (structure.structureType == STRUCTURE_SPAWN);
                }
            });

            if ((tickNow - mem.tickOld) > 100 || mem.tickOld == undefined)
            {
                mem.tickOld = tickNow;

                for (let i in roomspawns)
                {
                    roadNetworker.run(roomspawns[i]);
                }
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
                autoExtension.run(thisRoom);
            }

            /* get arrays */
            let workers = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                    return (creep.memory.role == ROLES.WORKER);
                }
            });
            let defenders = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                    return (creep.memory.role == ROLES.DEFENDER);
                }
            });
            let damagedCreeps = thisRoom.find(FIND_MY_CREEPS, {filter: (creep) => {
                    return (creep.hits < creep.hitsMax);
                }
            });
            let hostiles = thisRoom.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {
                    return (creep.owner.username != 'Source Keeper');
                }
            });
            let sites = thisRoom.find(FIND_MY_CONSTRUCTION_SITES);
            let repairs = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                    return (structure.hits < structure.hitsMax);
                }
            });
            let roadRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
                if (structure.structureType == STRUCTURE_ROAD)
                {
                    return (structure.hits < structure.hitsMax);
                }
            }});
            let wallRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
                if( structure.structureType == STRUCTURE_WALL ){
                    return (structure.hits < 1000);
                }
            }});
            let containerRepairs = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => {
                if (structure.structureType == STRUCTURE_CONTAINER)
                {
                    return (structure.hits < structure.hitsMax);
                }
            }});

            let reservoirs = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION ||
                            structure.structureType == STRUCTURE_SPAWN);
                }
            });
            let reservoirsNonFull = _.filter(reservoirs, (structure) => structure.energy < structure.energyCapacity);
            let towerSupply = thisRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {
                    return (structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity);
                }
            });
            let containers = thisRoom.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_CONTAINER});
            let containersNonEmpty = _.filter(containers, (structure) => structure.store[RESOURCE_ENERGY] > 0);
            let containersNonFull = _.filter(containers, (structure) => structure.store[RESOURCE_ENERGY] < structure.storeCapacity);

            let sources = thisRoom.find(FIND_SOURCES_ACTIVE);
            let dropped = thisRoom.find(FIND_DROPPED_RESOURCES); // find_dropped_energy

            /* calculate resource requirements */
            let energyCap = 0;
            let energyNeed = 0;
            for (let n in reservoirs)
            {
                energyNeed += (reservoirs[n].energyCapacity - reservoirs[n].energy);
                energyCap  += reservoirs[n].energyCapacity;
            }
            let containerCap = 0;
            let containerNeed = 0;
            for (let n in containers)
            {
                containerNeed += (containers[n].storeCapacity - containers[n].store[RESOURCE_ENERGY]);
                containerCap += containers[n].storeCapacity;
            }
            let towerSupplyCap = 0;
            let towerSupplyNeed = 0;
            for (let n in towerSupply)
            {
                towerSupplyNeed += (towerSupply[n].energyCapacity - towerSupply[n].energy);
                towerSupplyCap  += towerSupply[n].energyCapacity;
            }
            let sitesProgressMax = 0;
            let sitesProgressLeft = 0;
            for (let s in sites)
            {
                sitesProgressLeft += (sites[s].progressTotal - sites[s].progress);
                sitesProgressMax += sites[s].progressTotal;
            }
            let repairTotal = 0;
            let repairLeft = 0;
            for (let r in repairs)
            {
                repairLeft += (repairs[s].hitsMax - repairs[s].hits);
                repairTotal += repairs[s].hitsMax;
            }
            let roadworkTotal = 0;
            let roadworkLeft = 0;
            for (let r in roadRepairs)
            {
                roadworkLeft += (roadRepairs[r].hitsMax - roadRepairs[r].hits);
                roadworkTotal += roadRepairs[r].hitsMax;
            }
            let wallworkTotal = 0;
            let wallworkLeft = 0;
            for (let w in wallRepairs)
            {
                wallworkLeft += (1000 - wallRepairs[w].hits);
                wallworkTotal += 1000;
            }

            /* avoid div by zero */
            if (0 == energyCap)
            {
                energyCap = 1;
            }
            if (0 == containerCap)
            {
                containerCap = 1;
            }
            if (0 == towerSupplyCap)
            {
                towerSupplyCap = 1;
            }
            if (0 == sitesProgressMax)
            {
                sitesProgressMax = 1;
            }
            if (0 == repairTotal)
            {
                repairTotal = 1;
            }
            if (0 == roadworkTotal)
            {
                roadworkTotal = 1;
            }
            if (0 == wallworkTotal)
            {
                wallworkTotal = 1;
            }

            /* get percentage fraction requirements */

            /* harvesters dependent on energy emptiness of reservoirs */
            let requiredHarvesting = Math.round(100 * (energyNeed / energyCap));

            /* room controller upgraders, make sure less upgraders near going to next level is ok?
             * also, make sure we have atleast 1 % workers on it to never downgrade! */
            let requiredUpgrading = 0;
            if (thisRoom.controller.my)
            {
                if (thisRoom.controller.progress && thisRoom.controller.progressTotal)
                {
                    /* let's say base to 100%, more boost when close to finishing, only base when just completed a level */
                    var baseUpgradePercentage = 50;
                    requiredUpgrading = baseUpgradePercentage + Math.round((100 - baseUpgradePercentage) * (thisRoom.controller.progress / thisRoom.controller.progressTotal));
                }
                /* safeguard.. */
                if (0 < hostiles.length)
                {
                    if ((0 < thisRoom.controller.safeModeAvailable) && (!thisRoom.controller.safeModeCooldown))
                    {
                        thisRoom.controller.activateSafeMode();
                        Game.notify('Safe mode activated due to hostiles present (at ' + Game.time + ' ticks)!');
                    }
                }
            }

            /* Always require at least one upgrader. */
            if (requiredUpgrading < 1)
            {
                requiredUpgrading = 1;
            }
            let requiredContainerHarvesting = Math.round(100 * (containerNeed / containerCap)); // heavy task, not super critical (50% could be okay)
            let requiredTowerSupplying = Math.round(100 * (towerSupplyNeed / towerSupplyCap));
            let requiredBuilding = Math.round(100 * (sitesProgressLeft / sitesProgressMax));
            let requiredRepairing = Math.round(100 * (repairLeft / repairTotal));
            let requiredRoadworking = Math.round(100 * (roadworkLeft / roadworkTotal));
            let requiredWallworking = Math.round(100 * (wallworkLeft / wallworkTotal));

            /* get total percentage of requirements, used for extracting actual number of workers */
            let requiredTotal =
                requiredHarvesting +
                requiredContainerHarvesting +
                requiredTowerSupplying +
                requiredUpgrading +
                requiredBuilding +
                requiredRepairing +
                requiredRoadworking +
                requiredWallworking;

            if (requiredTotal < 100)
            {
                requiredTotal = 100;
            }

            /* get actual required workers on specific tasks. say around 8 per role is decent unless hostiles present, then reduce to 4 */
            let creepsPerWorkerRole = 2; // basis
            if (true)
            {
                if( thisRoom.controller ){
                    if( thisRoom.controller.my )
                    {
                        creepsPerWorkerRole = Math.round(1.5 * thisRoom.controller.level);
                    }
                }
            }

            /* Baseline workers/defenders. Peace time. */
            let requiredWorkers = Math.round((requiredTotal / 100) * creepsPerWorkerRole);
            let requiredDefenders = 0;

            if (0 < hostiles.length)
            {
                /* half work force, increased defence force */
                requiredWorkers = Math.round((requiredTotal / 100) * (creepsPerWorkerRole / 2));
                requiredDefenders = 6;
            }

            let availableWorkers = workers.length;
            let defendersAssigned = defenders.length;

            let requiredWorkersHarvesting         = Math.ceil((requiredHarvesting          /requiredTotal) * availableWorkers);
            let requiredWorkersContainerSupplying = Math.ceil((requiredContainerHarvesting /requiredTotal) * availableWorkers);
            let requiredWorkersTowerSupplying     = Math.ceil((requiredTowerSupplying      /requiredTotal) * availableWorkers);
            let requiredWorkersUpgrading          = Math.ceil((requiredUpgrading           /requiredTotal) * availableWorkers);
            let requiredWorkersBuilding           = Math.ceil((requiredBuilding            /requiredTotal) * availableWorkers);
            let requiredWorkersRepairing          = Math.ceil((requiredRepairing           /requiredTotal) * availableWorkers);
            let requiredWorkersRoadworking        = Math.ceil((requiredRoadworking         /requiredTotal) * availableWorkers);
            let requiredWorkersWallworking        = Math.ceil((requiredWallworking         /requiredTotal) * availableWorkers);

            /* if required, spawn a recon */
            /* NOTE: THIS BLOCKS CREATION OF OTHER WORKERS UNTIL SPAWNED! */
            /* example call: Game.rooms['E16S48'].memory.spawnRecon = 'E15S48'; */
            if (mem.spawnRecon != undefined)
            {
                let reconBody = [MOVE,ATTACK];
                let reconEnergyCost = BODYPART_COST["move"] + BODYPART_COST["attack"];

                if (energyCap < reconEnergyCost)
                {
                    console.log("Not enough capacity to spawn recon.");
                    mem.spawnRecon = undefined;
                }
                else
                {
                    for (let n in roomspawns)
                    {
                        let s = roomspawns[n];
                        let m = {
                            role: ROLES.WORKER,
                            task: TASKS.RECON,
                            direction: mem.spawnRecon,
                            originalRoom: thisRoom.name
                        };

                        if (OK == s.spawnCreep(reconBody, "Recon " + mem.lastCreepIndex.toString(), {memory: m}))
                        {
                            console.log('>>>>>>>> NEW RECON SPAWNED <<<<<<<<');
                            mem.spawnRecon = undefined;
                            mem.lastCreepIndex++;
                        }
                        else
                        {
                            console.log('Until recon spawn: ' + Math.round(100*(energyCap - energyNeed)/reconEnergyCost) + ' %');
                        }
                    }
                }
            }
            else if (mem.spawnClaimer != undefined)
            {
                let claimerBody = [MOVE,CLAIM];
                let claimerEnergyCost = BODYPART_COST["move"] + BODYPART_COST["claim"];

                if (energyCap < claimerEnergyCost)
                {
                    console.log("Not enough capacity to spawn claimer.");
                    mem.spawnClaimer = undefined;
                }
                else
                {
                    for (let n in roomspawns)
                    {
                        let s = roomspawns[n];
                        let m = {
                            role: ROLES.WORKER,
                            task: TASKS.CLAIM,
                            direction: mem.spawnClaimer,
                            originalRoom: thisRoom.name
                        };

                        if (OK == s.spawnCreep(claimerBody, "Claimer " + mem.lastCreepIndex.toString(), {memory: m}))
                        {
                            console.log('>>>>>>>> NEW CLAIMER SPAWNED <<<<<<<<');
                            mem.spawnClaimer = undefined;
                            mem.lastCreepIndex++;
                            break;
                        }
                        else
                        {
                            console.log('Until claimer spawn: ' + Math.round(100*(energyCap - energyNeed)/claimerEnergyCost) + ' %');
                        }
                    }
                }
            }
            else if (mem.spawnBuilder != undefined)
            {
                let builderBody = [WORK,CARRY,MOVE,MOVE];
                let builderEnergyCost = BODYPART_COST["work"] + BODYPART_COST["carry"] + (2 * BODYPART_COST["move"]);

                if (energyCap < builderEnergyCost)
                {
                    console.log("Not enough capacity to spawn the spawn builder.");
                    mem.spawnBuilder = undefined;
                }
                else
                {
                    for (let n in roomspawns)
                    {
                        let s = roomspawns[n];
                        let m = {
                            role: ROLES.WORKER,
                            task: TASKS.SPAWNBUILD,
                            direction: mem.spawnBuilder,
                            originalRoom: thisRoom.name
                        };

                        if (OK == s.spawnCreep(builderBody, "Spawnbuilder " + mem.lastCreepIndex.toString(), {memory: m}))
                        {
                            console.log('>>>>>>>> NEW BUILDER SPAWNED <<<<<<<<');
                            mem.spawnBuilder = undefined;
                            mem.lastCreepIndex++;
                            break;
                        }
                        else
                        {
                            console.log('Until spawn builder spawn: ' + Math.round(100*(energyCap - energyNeed)/builderEnergyCost) + ' %');
                        }
                    }
                }
            }
            else
            {
                /* let's create workers based on the current requirements */
                for (let n in roomspawns)
                {
                    let s = roomspawns[n];
                    if (availableWorkers < requiredWorkers)
                    {
                        let def_bodies = {
                            0: [WORK, WORK, WORK, WORK, CARRY, CARRY,               MOVE, MOVE, MOVE, MOVE], /* 700 */
                            1: [WORK, WORK, WORK, WORK, CARRY, CARRY,               MOVE, MOVE],             /* 600 */
                            2: [WORK, WORK,             CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],             /* 500 */
                            3: [WORK, WORK,             CARRY, CARRY,               MOVE, MOVE],             /* 400 */
                            4: [WORK,                   CARRY, CARRY,               MOVE],                   /* 300 */
                            5: [WORK,                   CARRY,                      MOVE]                    /* 200 */
                        };

                        let def_names = {
                            0: "Heavy",
                            1: "Medium B",
                            2: "Medium A",
                            3: "Normal",
                            4: "Light",
                            5: "Ultralight"
                        };

                        let w_mem = {
                            role: ROLES.WORKER,
                            src: 0, /* Will be assigned later. */
                            task: undefined, /* Will be assigned later. */
                            parent_spawn: s.id,
                            parent_room: thisRoom.name
                        };

                        if (undefined == mem.lastCreepIndex)
                        {
                            mem.lastCreepIndex = 0;
                        }

                        for (let i in def_bodies)
                        {
                            let def_body = def_bodies[i];
                            let c_name = def_names[i] + " " + mem.lastCreepIndex.toString();
                            let result = s.spawnCreep(def_body, c_name, {memory: w_mem});
                            let did_spawn = false;

                            switch (result)
                            {
                                case OK:
                                    console.log(c_name + " is spawning.");
                                    mem.lastCreepIndex++;
                                    did_spawn = true;
                                    break;

                                case ERR_NAME_EXISTS:
                                    mem.lastCreepIndex++;
                                    break;

                                case ERR_BUSY:
                                case ERR_NOT_ENOUGH_ENERGY:
                                    break;

                                case ERR_INVALID_ARGS:
                                    console.log("Invalid arguments for spawning " + c_name + ".");
                                    break;

                                default:
                                    console.log("Unknown spawn error (" + result + ") not handled.");
                                    break;
                            }

                            if (did_spawn)
                            {
                                break;
                            }
                        }
                    }
                    else if (defendersAssigned < requiredDefenders)
                    {
                        let def_bodies = {
                            0: [TOUGH, TOUGH, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE], /* 420 */
                            1: [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE],               /* 280 */
                            2: [TOUGH, TOUGH, RANGED_ATTACK, MOVE],                      /* 220 */
                            3: [TOUGH, TOUGH, ATTACK, MOVE],                             /* 150 */
                            4: [              ATTACK, MOVE]                              /* 130 */
                        };

                        let def_names = {
                            0: "Heavy Ranged Def",
                            1: "Heavy Def",
                            2: "Ranged Def",
                            3: "Def",
                            4: "Light Def"
                        };

                        let def_mem = {
                            role: ROLES.DEFENDER,
                            src: s.name,
                            task: undefined,
                            parent_spawn: s.id,
                            parent_room: thisRoom.name
                        };

                        for (let di in def_bodies)
                        {
                            let def_body = def_bodies[di];
                            let def_name = def_names[di] + " " + mem.lastCreepIndex.toString();
                            /* See which defender we can spawn immediately. */
                            let result = s.spawnCreep(def_body, def_name, {memory: def_mem});
                            let did_spawn = false;

                            switch (result)
                            {
                                case OK:
                                    console.log(def_name + " is spawning.");
                                    mem.lastCreepIndex++;
                                    did_spawn = true;
                                    break;

                                case ERR_NAME_EXISTS:
                                    mem.lastCreepIndex++;
                                    break;

                                case ERR_BUSY:
                                case ERR_NOT_ENOUGH_ENERGY:
                                    break;

                                case ERR_INVALID_ARGS:
                                    console.log("Invalid arguments for spawning " + def_name + ".");
                                    break;

                                default:
                                    console.log("Unknown spawn error (" + result + ") not handled.");
                                    break;
                            }

                            if (did_spawn)
                            {
                                break;
                            }
                        }
                    }
                }
            }

            /* perform creep processes */
            for (let c in workers)
            {
                let worker = workers[c];
                switch (worker.memory.task)
                {
                    case TASKS.HARVEST:
                        processHarvest.run(worker, reservoirsNonFull.concat(containersNonFull), sources, dropped);
                        break;

                    case TASKS.CONTAINER:
                        processHarvest.run(worker, containersNonFull, sources, dropped);
                        break;

                    case TASKS.TOWER:
                        processHarvest.run(worker, towerSupply, sources, dropped);
                        break;

                    case TASKS.UPGRADE:
                        processUpgrade.run(worker, sources, containersNonEmpty);
                        break;

                    case TASKS.BUILD:
                        processBuild.run(worker, sites, sources, containersNonEmpty);
                        break;

                    case TASKS.REPAIR:
                        processRepair.run(worker, repairs, sources, dropped);
                        break;

                    case TASKS.ROADWORK:
                        processRepair.run(worker, roadRepairs, sources, dropped);
                        break;

                    case TASKS.WALLWORK:
                        processRepair.run(worker, wallRepairs, sources, dropped);
                        break;

                    case TASKS.RECYCLE:
                        processRecycle.run(worker, roomspawns);
                        break;

                    case TASKS.RECON:
                        processRecon.run(worker);
                        break;

                    case TASKS.CLAIM:
                        processClaimer.run(worker);
                        break;

                    case TASKS.SPAWNBUILD:
                        processSpawnbuilder.run(worker);
                        break;

                    default:
                        worker.memory.task = undefined;
                        break;
                }
            }

            for (let i in defenders)
            {
                let defender = defenders[i];
                if (defender.memory.task == TASKS.RECYCLE)
                {
                    processRecycle.run(defender, roomspawns);
                }
                else
                {
                    if (defendersAssigned >= requiredDefenders)
                    {
                        defender.memory.shouldAttack = true;
                    }
                    processDefend.run(defender);
                }
            }

            /* repurpose every undefined creep */
            let workersAssignedHarvesting         = (_.filter(workers, (creep) => creep.memory.task == TASKS.HARVEST)).length;
            let workersAssignedContainerSupplying = (_.filter(workers, (creep) => creep.memory.task == TASKS.CONTAINER)).length;
            let workersAssignedTowerSupplying     = (_.filter(workers, (creep) => creep.memory.task == TASKS.TOWER)).length;
            let workersAssignedUpgrading          = (_.filter(workers, (creep) => creep.memory.task == TASKS.UPGRADE)).length;
            let workersAssignedBuilding           = (_.filter(workers, (creep) => creep.memory.task == TASKS.BUILD)).length;
            let workersAssignedRepairing          = (_.filter(workers, (creep) => creep.memory.task == TASKS.REPAIR)).length;
            let workersAssignedRoadwork           = (_.filter(workers, (creep) => creep.memory.task == TASKS.ROADWORK)).length;
            let workersAssignedWallwork           = (_.filter(workers, (creep) => creep.memory.task == TASKS.WALLWORK)).length;
            let workersAssignedRecycling          = (_.filter(workers, (creep) => creep.memory.task == TASKS.RECYCLE)).length;
            let workersAssignedRecon              = (_.filter(workers, (creep) => creep.memory.task == TASKS.RECON)).length;
            let workersAssignedSpawnbuilding      = (_.filter(workers, (creep) => creep.memory.task == TASKS.SPAWNBUILD)).length;

            var numSources = sources.length;
            var srcIndex = 0;
            for (var c in workers)
            {
                let worker = workers[c];
                let old_task = worker.memory.task;

                if (worker.memory.task == undefined)
                {
                    /* check recycling ticks, under 150 it may probably do no good? */
                    if (worker.ticksToLive < 150)
                    {
                        worker.memory.task = TASKS.RECYCLE;
                        workersAssignedRecycling++;
                    }
                    else if (workersAssignedHarvesting < requiredWorkersHarvesting)
                    {
                        worker.memory.task = TASKS.HARVEST;
                        workersAssignedHarvesting++;
                    }
                    else if (workersAssignedBuilding < requiredWorkersBuilding)
                    {
                        worker.memory.task = TASKS.BUILD;
                        workersAssignedBuilding++;
                    }
                    else if (workersAssignedUpgrading < requiredWorkersUpgrading)
                    {
                        worker.memory.task = TASKS.UPGRADE;
                        workersAssignedUpgrading++;
                    }
                    else if (workersAssignedTowerSupplying < requiredWorkersTowerSupplying)
                    {
                        worker.memory.task = TASKS.TOWER;
                        workersAssignedTowerSupplying++;
                    }
                    else if (workersAssignedContainerSupplying < requiredWorkersContainerSupplying)
                    {
                        worker.memory.task = TASKS.CONTAINER;
                        workersAssignedContainerSupplying++;
                    }
                    else if (workersAssignedRepairing < requiredWorkersRepairing)
                    {
                        worker.memory.task = TASKS.REPAIR;
                        workersAssignedRepairing++;
                    }
                    else if (workersAssignedRoadwork < requiredWorkersRoadworking)
                    {
                        worker.memory.task = TASKS.ROADWORK;
                        workersAssignedRoadwork++;
                    }
                    else if (workersAssignedWallwork < requiredWallworking)
                    {
                        worker.memory.task = TASKS.WALLWORK;
                        workersAssignedWallwork++;
                    }
                    else
                    {
                        /* if we got here, we have overflow of workers.. just recycle, can be in handy if hostiles appear to get extra energy? */
                        /*worker.memory.task = TASKS.RECYCLE;*/

                        /* Container supply as standby task.. */
                        worker.memory.task = TASKS.CONTAINER;
                        workersAssignedContainerSupplying++;
                    }
                }

                if (old_task != worker.memory.task)
                {
                    worker.say(worker.memory.task);
                    console.log(worker.name + ": Assigned to " + worker.memory.task);
                }

                /* assign harvest source */
                worker.memory.src = srcIndex;
                srcIndex = (srcIndex + 1) % numSources;
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
        }
    }
}
