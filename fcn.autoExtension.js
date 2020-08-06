module.exports = {
    run: function(currentRoom)
    {
        /* Find number of available extensions to be placed. */
        var lvl = currentRoom.controller.level;

        /* Available extensions based on level. */
        var max_count = CONTROLLER_STRUCTURES["extension"][lvl];

        /* Get list of extensions built already. */
        var ext = currentRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_EXTENSION);}});

        /* Get number of extensions to build. */
        var n_to_build = max_count - ext.length;

        if (0 < n_to_build)
        {
            /* Get terrain. */
            var t = currentRoom.getTerrain();

            /* Get available number of extensions to place. */
            var sites = currentRoom.find(FIND_MY_CONSTRUCTION_SITES);

            /* Find position of the spawn. */
            var spawn_pos = currentRoom.find(FIND_MY_SPAWNS)[0].pos;

            for (var xx = spawn_pos.x - 5; xx <= spawn_pos.x + 5; xx += 2)
            {
                for (var yy = spawn_pos.y - 5; yy <= spawn_pos.y + 5; yy += 2)
                {
                    if (0 < n_to_build)
                    {
                        /* Check that there is no obstacle and if not place a construction site here. */
                        var is_obstructed = false;
                        if (TERRAIN_MASK_WALL == t.get(xx, yy))
                        {
                            is_obstructed = true;
                        }
                        else
                        {
                            for (var i = 0; i < ext.length; i++)
                            {
                                if ((xx == ext[i].pos.x) && (yy == ext[i].pos.y))
                                {
                                    is_obstructed = true;
                                    break;
                                }
                            }

                            if (!is_obstructed)
                            {
                                for (var i = 0; i < sites.length; i++)
                                {
                                    if ((xx == sites[i].pos.x) && (yy == sites[i].pos.y))
                                    {
                                        is_obstructed = true;
                                    }
                                }
                            }
                        }

                        if (!is_obstructed)
                        {
                            currentRoom.createConstructionSite(xx, yy, STRUCTURE_EXTENSION);
                            n_to_build--;
                        }
                    }
                }
            }
        }

        /* Build towers. */

        /* Available extensions based on level. */
        max_count = CONTROLLER_STRUCTURES["tower"][lvl];

        /* Get list of towers built already. */
        var twr = currentRoom.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_TOWER);}});

        /* Get number of extensions to build. */
        n_to_build = max_count - twr.length;

        if (0 < n_to_build)
        {
            /* Get terrain. */
            var t = currentRoom.getTerrain();

            /* Get available number of extensions to place. */
            var sites = currentRoom.find(FIND_MY_CONSTRUCTION_SITES);

            /* Find position of the spawn. */
            var spawn_pos = currentRoom.find(FIND_MY_SPAWNS)[0].pos;

            for (var xx = spawn_pos.x - 10; xx <= spawn_pos.x + 10; xx ++)
            {
                var yy = spawn_pos.y;
                if (0 < n_to_build)
                {
                    /* Check that there is no obstacle and if not place a construction site here. */
                    var is_obstructed = false;
                    if (TERRAIN_MASK_WALL == t.get(xx, yy))
                    {
                        is_obstructed = true;
                    }
                    else
                    {
                        for (var i = 0; i < twr.length; i++)
                        {
                            if ((xx == twr[i].pos.x) && (yy == twr[i].pos.y))
                            {
                                is_obstructed = true;
                                break;
                            }
                        }

                        if (!is_obstructed)
                        {
                            for (var i = 0; i < sites.length; i++)
                            {
                                if ((xx == sites[i].pos.x) && (yy == sites[i].pos.y))
                                {
                                    is_obstructed = true;
                                }
                            }
                        }
                    }

                    if (!is_obstructed)
                    {
                        currentRoom.createConstructionSite(xx, yy, STRUCTURE_TOWER);
                        n_to_build--;
                    }
                }
            }
        }
    }
};
