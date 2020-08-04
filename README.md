# What is this?

Overwatch script for the game Screeps.

The Overwatch scripts is an automated system for generating creeps and assigning worker roles based on current room requirements.
The script handles automatic building of towers, extensions and building a road network between structures, sources, minerals, etc.

# TODO - Known issues

1. Currently, if a road is close to a room exit, a creep may accidently exit the room if another creep is in the way of the path.
This results in a creep that can not work and is unable to get a new role. Right now, a solution is to avoid rooms where paths to
sources, minerals and controllers are close to room exits.

2. Default patrolling defender count is 2, and if hostile creeps appear the workforce is set to recycle to create more defenders.
This has not really been tested.
