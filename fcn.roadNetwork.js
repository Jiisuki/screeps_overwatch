/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('fcn.roadNetwork');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(currentSpawn){
        //var currentSpawn = Game.spawns['Spawn1'];
        var currentRoom = currentSpawn.room;
        
        /* find path between spawn and sources */
        var sources = currentRoom.find(FIND_SOURCES);
        for( var s in sources ){
            var path = currentRoom.findPath(currentSpawn.pos, sources[s].pos, {ignoreRoads:true, ignoreCreeps:true, swampCost:1});
            for( var i = 0; i < path.length - 1; i++ ){
                
                currentRoom.createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
            }
        }
        
        /* minerals */
        sources = currentRoom.find(FIND_MINERALS);
        for( var s in sources ){
            var path = currentRoom.findPath(currentSpawn.pos, sources[s].pos, {ignoreRoads:true, ignoreCreeps:true, swampCost:1});
            for( var i = 0; i < path.length - 1; i++ ){
                currentRoom.createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
            }
        }
        
        /* room controller */
        var path = currentRoom.findPath(currentSpawn.pos, currentRoom.controller.pos, {ignoreRoads:true, ignoreCreeps:true, swampCost:1});
        for( var i = 0; i < path.length - 1; i++ ){
            currentRoom.createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
        }
        
        /* towers */
        var towers = currentRoom.find(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_TOWER});
        for (var t in towers)
        {
            path = currentRoom.findPath(currentSpawn.pos, towers[t].pos, {ignoreRoads:true, ignoreCreeps:true, swampCost:1});
            for (var i = 0; i < path.length - 1; i++)
            {
                currentRoom.createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
            }
        }
        
        /* construction sites that are not roads.. */
        if (true)
        {
            var csites = currentRoom.find(FIND_CONSTRUCTION_SITES, {filter: (structure) => structure.structureType != STRUCTURE_ROAD});
            for (var c in csites)
            {
                path = currentRoom.findPath(currentSpawn.pos, csites[c].pos, {ignoreRoads:true, ignoreCreeps:true, swampCost:1});
                for (var i = 0; i < path.length - 1; i++)
                {
                    currentRoom.createConstructionSite(path[i].x, path[i].y, STRUCTURE_ROAD);
                }
            }
        }
    }
};