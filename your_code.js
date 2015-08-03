// This is where you put your code. Your aim is to write some code that gets the player to the end of the maze and that
// it works for every given maze.
//
// You'll be evaluated on the following points:
//
// 1. (70%) Your code works - for every given maze, your player makes it to the end when we run it (don't make us wait forever though)
// 2. (20%) Code readability - we can read and understand your code
// 3. (10%) Documentation - you explained well your approach and documented your code (where it was needed)
//
// Good luck!

"use strict";

MazeAPI.onRun(function() {

    console.log("Your code is running ..");

    //TODO: Explain your approach here
    /*
     * The key ideas for the maze algorithm are simple, but powerful.
     *
     * We use only local information - the branches available at every coordinate.
     * We save this local information for reuse whenever we return to the same square.
     *
     * Optimizations that utilize global information (namely, the geometrical structure of the paths)
     * would allow for a faster, better-scaling algorithm, but would be more complex.
     *
     * // ******* //
     * // CONCEPT 1
     * // ******* //
     * The first concept used in the algorithm is to break loops by replacing one point in each loop
     * with a wall (logically).  This will never close off a route to the exit.
     * (Note that paths that merge are effectively loops, and the same reasoning applies.)
     * See comments in the code itself for the simple, slick approach that is used to detect and close loops
     * via local information only.
     *
     * // ******* //
     * // CONCEPT 2
     * // ******* //
     * Once loops have logically been eliminated, the entire maze becomes a tree structure,
     * which simplifies the logic.  We use a depth-first approach to walking through the maze;
     * this means that we always choose to move deeper into the tree, before choosing to backtrack.
     * If we reach a dead end, we backtrack to the nearest branch and a simple trick can be used to logically replace
     * the entrance to the dead end with a logical, local wall (see comments in the code).
     * We then move down the next untraveled branch (if there is one) or, if there is no untraveled branch available,
     * we continue backtracking. This procedure continues in iterative fashion,
     * closing off entire paths with logical walls until the only remaining path becomes the one to the end of the maze.
     *
     * // ******* //
     * // ADDITIONAL COMMENTS
     * // ******* //
     * The above algorithm is robust against the starting position.
     * The starting position can be anywhere inside of the maze (not just at an edge or corner).
     * Also, the maze does not need to be rectangular.
     * There is a guaranteed O(n) efficiency to this algorithm because every path is guaranteed to
     * be traversed at most once in either direction.
     *
     * NOTE: An ECMAScript 6 supporting browser is required.
     */

    // ****************************************************************************** //
    // Create a helper object that wraps the internal functions
    // ****************************************************************************** //
    var internals = new implementation();
    internals.expandBufferIfNecessary({"row" : internals.maxMazeHeight / 2 + 1, "col" : internals.maxMazeWidth / 2 + 1}); // Initialize the buffer for the default maximum maze dimensions.

    // ****************************************************************************** //
    // Kick off the recursive movement through the maze.
    // ****************************************************************************** //
    move();

    // ****************************************************************************** //
    // THE FOLLOWING FUNCTION IS CALLED FROM IMMEDIATELY ABOVE
    // This is the core function - it makes a single move through the maze,
    // starting at the current position
    // ****************************************************************************** //
    function move() {

        //console.log("Look what is around you: ", MazeAPI.lookAround());

        var surroundings = MazeAPI.lookAround();

        if (MazeAPI.isEnd()) {
            // We are at the exit of the maze!
            return;
        }

        var newPos = null;

        // ****************************************************************************** //
        // This is a depth-first algorithm.
        // Therefore, first check if there is an adjacent position that is available (not a wall)
        // and that we have NOT visited before.
        // The order does not matter - if there are more than one such open branch, just move down the first one we find.
        // The condition of an open branch is that ALL FOUR DIRECTIONS leading FROM the target (adjacent) position
        // must NEVER have been traversed.
        //
        // NOTE: THIS IS THE LOOP-BREAKING TRICK noted in the comments above.
        // (Loops are broken because (backtracking aside) we will NEVER move into an adjacent position that we have EVER been on before,
        // regardless of whether or not we actually came from that adjacent position to the current position.
        // Backtracking is the single exception, but backtracking is a case in which we are following a path already traveled,
        // not creating a loop.)
        // ****************************************************************************** //
        var openBranch = internals.detectOpenBranch(surroundings);
        if (openBranch) {
            // A path that has NEVER been taken is available.  Take it.
            // ... This works even for corridors without a branch.
            newPos = openBranch;
        }
        else {
            // ****************************************************************************** //
            // No open branch is available, so we must backtrack.
            // The algorithm guarantees that there can be only one possible backtracking direction.
            // SIMPLE TRICK: if we have traversed in BOTH directions over a given boundary,
            // this counts as a WALL and is rejected as a backtracking possibility.
            // Therefore, the condition for a BACKTRACKING path is simply that
            // we must NEVER have previously moved FROM the current position TO the target position,
            // but that we MUST HAVE previously moved FROM the target position TO the current position.
            // Consideration reveals that we will never form a loop in this fashion, but can only backtrack.
            // ****************************************************************************** //
            var backtrackBranch = internals.locateBacktrackBranch(surroundings);
            if (!backtrackBranch) {
                // Either the algorithm is broken, or there is no exit to this maze
                throw "There is no exit to the maze!";
            }
            newPos = backtrackBranch;
        }

        // Set the proper bit to indicate that we are moving in the given direction.
        var currentData = internals.mazeData[internals.row * (internals.maxMazeWidth + 1) + internals.col];
        currentData |= newPos.bit;
        internals.mazeData[internals.row * (internals.maxMazeWidth + 1) + internals.col] = currentData;
        internals.row = newPos.row;
        internals.col = newPos.col;
        MazeAPI.move(newPos.dir, move);
    }

});

function implementation() {

    var self = this;

    // Should be self-explanatory - the MAXIMUM allowed width/height of the maze
    // (the actual width/height can be less).
    // Will be dynamically resized if necessary.
    self.maxMazeWidth = 50;
    self.maxMazeHeight = 50;

    // Track our current position in the maze.
    self.row = 0;
    self.col = 0;

    // ****************************************************************************** //
    // Create a buffer to track LOCAL maze data.
    // The starting point is taken to be (0,0), and the coordinates can be negative.
    // EACH COORDINATE corresponds to a single byte in the buffer at index (row * maxMazeWidth + col).
    //
    // The BYTE for each coordinate is a bitmask:
    // 0x01 represents UP
    // 0x02 represents RIGHT
    // 0x04 represents DOWN
    // 0x08 represents LEFT
    // (The remaining 4 bits in each byte are unused)
    //
    // If a bit is SET, it means that the path FROM the given coordinate in the given direction has been traversed.
    // This local information is all the information that we need to solve the maze in O(n).
    // ****************************************************************************** //
    self.mazeData = null;

    self.detectOpenBranch = function(surroundings) {
        if (surroundings.up === "space") {
            var testPos = {"row" : self.row-1, "col" : self.col, "bit" : 1, "dir" : "up"};
            if (testDirection(testPos)) {
                return testPos;
            }
        }
        if (surroundings.right === "space") {
            var testPos = {"row" : self.row, "col" : self.col+1, "bit" : 2, "dir" : "right"};
            if (testDirection(testPos)) {
                return testPos;
            }
        }
        if (surroundings.down === "space") {
            var testPos = {"row" : self.row+1, "col" : self.col, "bit" : 4, "dir" : "down"};
            if (testDirection(testPos)) {
                return testPos;
            }
        }
        if (surroundings.left === "space") {
            var testPos = {"row" : self.row, "col" : self.col-1, "bit" : 8, "dir" : "left"};
            if (testDirection(testPos)) {
                return testPos;
            }
        }

        return null;

        function testDirection(testPos) {
            self.expandBufferIfNecessary(testPos);

            // ****************************************************************************** //
            // A position being tested represents an open branch
            // if we have NEVER been at the given position.
            // This is the case if the 'up', 'down', 'right' & 'left' bits
            // of the position being tested are all unset
            // (meaning that we never moved in any direction out of the given position)
            // ****************************************************************************** //

            // Get the data byte corresponding to the test position
            var testByte = self.mazeData[testPos.row * (self.maxMazeWidth + 1) + testPos.col];
            if ( (testByte & 1) || (testByte & 2) || (testByte & 4) || (testByte & 8) ) {
                return false;
            }
            return true;
        }
    };

    // THE FOLLOWING FUNCTION IS CALLED FROM ABOVE
    self.locateBacktrackBranch = function(surroundings) {
        if (surroundings.up === "space") {
            var testPos = {"row" : self.row-1, "col" : self.col, "bit" : 1, "dir" : "up"};
            if (testDirection(testPos, 4, 1)) {
                return testPos;
            }
        }
        if (surroundings.right === "space") {
            var testPos = {"row" : self.row, "col" : self.col+1, "bit" : 2, "dir" : "right"};
            if (testDirection(testPos, 8, 2)) {
                return testPos;
            }
        }
        if (surroundings.down === "space") {
            var testPos = {"row" : self.row+1, "col" : self.col, "bit" : 4, "dir" : "down"};
            if (testDirection(testPos, 1, 4)) {
                return testPos;
            }
        }
        if (surroundings.left === "space") {
            var testPos = {"row" : self.row, "col" : self.col-1, "bit" : 8, "dir" : "left"};
            if (testDirection(testPos, 2, 8)) {
                return testPos;
            }
        }

        return null;

        function testDirection(testPos, testBitFromTarget, testBitToTarget) {
            self.expandBufferIfNecessary(testPos);

            // ****************************************************************************** //
            // A position being tested represents a branch that can be backtracked across
            // if and only if the path FROM the test position TO our current position has been traversed,
            // but NOT the path FROM our current position TO the test position.
            // ****************************************************************************** //

            // Get the data byte corresponding to the test position and to the current position
            var targetData = self.mazeData[testPos.row * (self.maxMazeWidth + 1) + testPos.col];
            var currentData = self.mazeData[self.row * (self.maxMazeWidth + 1) + self.col];
            if ( ((targetData & testBitFromTarget) != 0) && ((currentData & testBitToTarget) == 0) ) {
                return true;
            }
            return false;
        }
    };

    // THE FOLLOWING FUNCTION IS CALLED FROM ABOVE
    // Definitions of functions are allowed after calls to those functions, when this function syntax is used
    self.expandBufferIfNecessary = function(testPos) {
        // In case the maze is larger than our current maximum, exponentially increase its size.
        var doExpandWidth = false;
        var doExpandHeight = false;
        var x = testPos.col;
        var y = testPos.row;
        if (Math.abs(x) > self.maxMazeWidth / 2) { doExpandWidth = true; }
        if (Math.abs(y) > self.maxMazeHeight / 2) { doExpandHeight = true; }
        if (doExpandWidth || doExpandHeight) {
            var newBufferSize = ((doExpandWidth ? self.maxMazeWidth * 2 : self.maxMazeWidth) + 1) * ((doExpandHeight ? self.maxMazeHeight * 2 : self.maxMazeHeight) + 1);
            var tempBuffer = new ArrayBuffer(newBufferSize);
            var tempData = new Uint8Array(tempBuffer);
            if (self.mazeData !== null) {
                var currentTargetIndex = 0;
                var currentSourceIndex = 0;
                for (var j = 0; j < self.maxMazeHeight + 1; ++j) {
                    tempData.set(self.mazeData.subarray(currentSourceIndex, currentSourceIndex + self.maxMazeWidth), currentTargetIndex);
                    currentSourceIndex += self.maxMazeWidth;
                    currentTargetIndex += (doExpandWidth ? self.maxMazeWidth * 2 : self.maxMazeWidth) + 1;
                }
            }
            self.maxMazeWidth *= 2;
            self.maxMazeHeight *= 2;
            self.mazeData = tempData;
        }
    };

}
