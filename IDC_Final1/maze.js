"use strict";

var canvas;
var gl;

var numTimesToSubdivide = 6;

var index = 0;

// For quads
var spacing = 1.0;
var v = 0.5;

// Wall thickness
var thickness = 0.2;
var thickOffset = thickness/2;

var texSize = 64;

// Create a checkerboard pattern using floats
var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++)
        for ( var j = 0; j < texSize; j++)
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture
var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ )
        for ( var j = 0; j < texSize; j++ )
           for(var k =0; k<4; k++)
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];

var texCoordsArray = [];
var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

var pointsArray = [];
var normalsArray = [];
var colorsArray;

var colorTable = {
    'cyan'      : vec4( 0.0, 1.0, 1.0, 1.0 ),
    'yellow'    : vec4( 1.0, 1.0, 0.0, 1.0 ),
    'magenta'   : vec4( 1.0, 0.0, 1.0, 1.0 ),
    'blue'      : vec4( 0.0, 0.0, 1.0, 1.0 ),
    'orange'    : vec4( 1.0, 0.5, 0.0, 1.0 ),
    'red'       : vec4( 1.0, 0.0, 0.0, 1.0 ),
    'green'     : vec4( 0.0, 1.0, 0.0, 1.0 ),
    'black'     : vec4( 0.0, 0.0, 0.0, 1.0 ),
    'white'     : vec4( 1.0, 1.0, 1.0, 1.0 ),
    'gray'      : vec4( 0.5, 0.5, 0.5, 1.0 ),
};

// Spherical coordinate angles for rotating the cube
var THETA = radians(45);
var PHI = radians(45);

// Incremental angles to add to THETA and PHI while rotating
var dTHETA = 0;
var dPHI = 0;

// Camera distance from object
var cameraRadius = 25.0;

// For zooming in and out
var cameraRadiusMin = 12.5;
var cameraRadiusMax = 50.0;

var fovy = 45.0;
var aspect = 1.0;
var near = 0.3;
var far = 1000;


var left = -3.0;
var right = 3.0;
var ytop =3.0;
var bottom = -3.0;

var va = vec4(0.0, 0.0, -1*2,1*2);
var vb = vec4(0.0, 0.942809*2, 0.333333*2, 1*2);
var vc = vec4(-0.816497*2, -0.471405*2, 0.333333*2, 1*2);
var vd = vec4(0.816497*2, -0.471405*2, 0.333333*2,1*2);


// Define origin of the canvas
var originX = 5.0;
var originY = 0.0;
var originZ = 5.0;

var lightPosition = vec4( 0, originY+15.0, 0, 0.0 );
var lightAmbient = vec4( 0.7, 0.7, 0.7, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 0.7, 0.7, 0.7, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 100.0;


var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;


var worldViewMatrix = mat4(), worldViewMatrixLoc;


var eye;
var at = vec3(originX, originY, originZ);
var up = vec3(0.0, 1.0, 0.0);

// LOOK AT ME
var actionQueue = [];
var currentAction = 'none';
var translationDir = 'none';

var mazeArray;
var level;
var startingLevel = 1;

var mazelength = 10;
var mazewidth = 10;

var spherePosition = vec4(0,0,0,1); // initialize to origin
var sphereTranslationMatrix = mat4(); // initalize to identity

var h2;
var seconds = 0;
var minutes = 0;
var hours = 0;
var t;


function add() {
    seconds++;
    h2 = document.getElementsByTagName("h2")[0];
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
    }
    h2.textContent = (hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds);
    timer();
}

function timer() {
    t = setTimeout(add, 1000);
}

function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

function texCoordQuad()
{
    texCoordsArray.push( texCoord[0] );
    texCoordsArray.push( texCoord[1] );
    texCoordsArray.push( texCoord[2] );
    texCoordsArray.push( texCoord[0] );
    texCoordsArray.push( texCoord[2] );
    texCoordsArray.push( texCoord[3] );
}

// Function that generates a quad
function quad(a, b, c, d, v)
{
    var vertices = [
        vec4( -v, -v,  v, 1.0 ),
        vec4( -v,  v,  v, 1.0 ),
        vec4(  v,  v,  v, 1.0 ),
        vec4(  v, -v,  v, 1.0 ),
        vec4( -v, -v, -v, 1.0 ),
        vec4( -v,  v, -v, 1.0 ),
        vec4(  v,  v, -v, 1.0 ),
        vec4(  v, -v, -v, 1.0 )
    ];

    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    normal = vec4(normal);
    //var normal = vec3(cross(t1, t2));

    var indices = [ a, b, c, a, c, d ];
    for ( var i = 0; i < indices.length; ++i ) {
        pointsArray.push( vertices[indices[i]] );
        normalsArray.push(normal);
    }

    texCoordQuad();
}

function thickQuad(type, v)
{

    /*
    quad( 2, 3, 7, 6, v); // right face
    quad( 5, 4, 0, 1, v); // left face
    */

    if (type == 'right' || type == 'left') {

        // MAIN SIDES

        var a = (type == 'right') ?  2 : 5;
        var b = (type == 'right') ?  3 : 4;
        var c = (type == 'right') ?  7 : 0;
        var d = (type == 'right') ?  6 : 1;

        var verticesLeft = [
            vec4( -v-thickOffset, -v,  v, 1.0 ),
            vec4( -v-thickOffset,  v,  v, 1.0 ),
            vec4(  v-thickOffset,  v,  v, 1.0 ),
            vec4(  v-thickOffset, -v,  v, 1.0 ),
            vec4( -v-thickOffset, -v, -v, 1.0 ),
            vec4( -v-thickOffset,  v, -v, 1.0 ),
            vec4(  v-thickOffset,  v, -v, 1.0 ),
            vec4(  v-thickOffset, -v, -v, 1.0 )
        ];

        var verticesRight = [
            vec4( -v+thickOffset, -v,  v, 1.0 ),
            vec4( -v+thickOffset,  v,  v, 1.0 ),
            vec4(  v+thickOffset,  v,  v, 1.0 ),
            vec4(  v+thickOffset, -v,  v, 1.0 ),
            vec4( -v+thickOffset, -v, -v, 1.0 ),
            vec4( -v+thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset, -v, -v, 1.0 )
        ];

        var t1_left = subtract(verticesLeft[b], verticesLeft[a]);
        var t2_left = subtract(verticesLeft[c], verticesLeft[b]);
        var normal_left = cross(t1_left, t2_left);
        normal_left = vec4(normal_left);
        
        var t1_right = subtract(verticesRight[b], verticesRight[a]);
        var t2_right = subtract(verticesRight[c], verticesRight[b]);
        var normal_right = cross(t1_right, t2_right);
        normal_right = vec4(normal_right);

        var indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesLeft[indices[i]] );
            normalsArray.push(normal_left);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesRight[indices[i]] );
            normalsArray.push(normal_right);
        }

        texCoordQuad();
        texCoordQuad();

        // TOP/BOTTOM CAPS

        a = (type == 'right') ? 0 : 4;
        b = (type == 'right') ? 1 : 5;
        c = (type == 'right') ? 2 : 6;
        d = (type == 'right') ? 3 : 7;

        var verticesTop = [
            vec4(  v-thickOffset,  v,  v, 1.0 ), // start at front left corner
            vec4(  v-thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset,  v,  v, 1.0 ),
            vec4( -v-thickOffset,  v,  v, 1.0 ), // start at front left corner
            vec4( -v-thickOffset,  v, -v, 1.0 ),
            vec4( -v+thickOffset,  v, -v, 1.0 ),
            vec4( -v+thickOffset,  v,  v, 1.0 )
        ];

        var verticesBottom = [
            vec4(  v-thickOffset, -v,  v, 1.0 ), // start at front left corner
            vec4(  v-thickOffset, -v, -v, 1.0 ),
            vec4(  v+thickOffset, -v, -v, 1.0 ),
            vec4(  v+thickOffset, -v,  v, 1.0 ),
            vec4( -v-thickOffset, -v,  v, 1.0 ), // start at front left corner
            vec4( -v-thickOffset, -v, -v, 1.0 ),
            vec4( -v+thickOffset, -v, -v, 1.0 ),
            vec4( -v+thickOffset, -v,  v, 1.0 ) 
        ];

        var t1_top = subtract(verticesTop[b], verticesTop[a]);
        var t2_top = subtract(verticesTop[c], verticesTop[b]);
        var normal_top = cross(t1_top, t2_top);
        normal_top = vec4(normal_top);
        
        var t1_bottom = subtract(verticesBottom[b], verticesBottom[a]);
        var t2_bottom = subtract(verticesBottom[c], verticesBottom[b]);
        var normal_bottom = cross(t1_bottom, t2_bottom);
        normal_bottom = vec4(normal_bottom);

        indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesTop[indices[i]] );
            normalsArray.push(normal_top);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesBottom[indices[i]] );
            normalsArray.push(normal_bottom);
        }

        texCoordQuad();
        texCoordQuad();

        // SIDE CAPS

        a = (type == 'right') ? 0 : 4;
        b = (type == 'right') ? 1 : 5;
        c = (type == 'right') ? 2 : 6;
        d = (type == 'right') ? 3 : 7;

        var verticesFront = [
            vec4(  v-thickOffset, -v,  v, 1.0 ), // start at front bottom corner
            vec4(  v-thickOffset,  v,  v, 1.0 ),
            vec4(  v+thickOffset,  v,  v, 1.0 ),
            vec4(  v+thickOffset, -v,  v, 1.0 ),
            vec4( -v-thickOffset, -v,  v, 1.0 ), // start at front bottom corner
            vec4( -v-thickOffset,  v,  v, 1.0 ),
            vec4( -v+thickOffset,  v,  v, 1.0 ),
            vec4( -v+thickOffset, -v,  v, 1.0 )
        ];

        var verticesBack = [
            vec4(  v-thickOffset, -v, -v, 1.0 ), // start at front bottom corner
            vec4(  v-thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset,  v, -v, 1.0 ),
            vec4(  v+thickOffset, -v, -v, 1.0 ),
            vec4( -v-thickOffset, -v, -v, 1.0 ), // start at front bottom corner
            vec4( -v-thickOffset,  v, -v, 1.0 ),
            vec4( -v+thickOffset,  v, -v, 1.0 ),
            vec4( -v+thickOffset, -v, -v, 1.0 )
        ];

        var t1_front = subtract(verticesFront[b], verticesFront[a]);
        var t2_front = subtract(verticesFront[c], verticesFront[b]);
        var normal_front = cross(t1_front, t2_front);
        normal_front = vec4(normal_front);
        
        var t1_back = subtract(verticesBack[b], verticesBack[a]);
        var t2_back = subtract(verticesBack[c], verticesBack[b]);
        var normal_back = cross(t1_back, t2_back);
        normal_back = vec4(normal_back);

        indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesFront[indices[i]] );
            normalsArray.push(normal_front);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesBack[indices[i]] );
            normalsArray.push(normal_back);
        }

        texCoordQuad();
        texCoordQuad();
    }

    else if (type == 'front' || type == 'back') {

        // MAIN SIDES

        var a = (type == 'front') ?  1 : 4;
        var b = (type == 'front') ?  0 : 5;
        var c = (type == 'front') ?  3 : 6;
        var d = (type == 'front') ?  2 : 7;

        var verticesFront = [
            vec4( -v, -v,  v+thickOffset, 1.0 ),
            vec4( -v,  v,  v+thickOffset, 1.0 ),
            vec4(  v,  v,  v+thickOffset, 1.0 ),
            vec4(  v, -v,  v+thickOffset, 1.0 ),
            vec4( -v, -v, -v+thickOffset, 1.0 ),
            vec4( -v,  v, -v+thickOffset, 1.0 ),
            vec4(  v,  v, -v+thickOffset, 1.0 ),
            vec4(  v, -v, -v+thickOffset, 1.0 )
        ];

        var verticesBack = [
            vec4( -v, -v,  v-thickOffset, 1.0 ),
            vec4( -v,  v,  v-thickOffset, 1.0 ),
            vec4(  v,  v,  v-thickOffset, 1.0 ),
            vec4(  v, -v,  v-thickOffset, 1.0 ),
            vec4( -v, -v, -v-thickOffset, 1.0 ),
            vec4( -v,  v, -v-thickOffset, 1.0 ),
            vec4(  v,  v, -v-thickOffset, 1.0 ),
            vec4(  v, -v, -v-thickOffset, 1.0 )
        ];

        var t1_front = subtract(verticesFront[b], verticesFront[a]);
        var t2_front = subtract(verticesFront[c], verticesFront[b]);
        var normal_front = cross(t1_front, t2_front);
        normal_front = vec4(normal_front);
        
        var t1_back = subtract(verticesBack[b], verticesBack[a]);
        var t2_back = subtract(verticesBack[c], verticesBack[b]);
        var normal_back = cross(t1_back, t2_back);
        normal_back = vec4(normal_back);

        var indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesFront[indices[i]] );
            normalsArray.push(normal_front);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesBack[indices[i]] );
            normalsArray.push(normal_back);
        }

        texCoordQuad();
        texCoordQuad();

        // TOP/BOTTOM CAPS

        a = (type == 'front') ? 0 : 4;
        b = (type == 'front') ? 1 : 5;
        c = (type == 'front') ? 2 : 6;
        d = (type == 'front') ? 3 : 7;

        var verticesTop = [
            vec4( -v,  v,  v+thickOffset, 1.0 ), // start at front left corner
            vec4( -v,  v,  v-thickOffset, 1.0 ),
            vec4(  v,  v,  v-thickOffset, 1.0 ),
            vec4(  v,  v,  v+thickOffset, 1.0 ),
            vec4( -v,  v, -v+thickOffset, 1.0 ), // start at front left corner
            vec4( -v,  v, -v-thickOffset, 1.0 ),
            vec4(  v,  v, -v-thickOffset, 1.0 ),
            vec4(  v,  v, -v+thickOffset, 1.0 )
        ];

        var verticesBottom = [
            vec4( -v, -v,  v+thickOffset, 1.0 ), // start at front left corner
            vec4( -v, -v,  v-thickOffset, 1.0 ),
            vec4(  v, -v,  v-thickOffset, 1.0 ),
            vec4(  v, -v,  v+thickOffset, 1.0 ),
            vec4( -v, -v, -v+thickOffset, 1.0 ), // start at front left corner
            vec4( -v, -v, -v-thickOffset, 1.0 ),
            vec4(  v, -v, -v-thickOffset, 1.0 ),
            vec4(  v, -v, -v+thickOffset, 1.0 )
        ];

        var t1_top = subtract(verticesTop[b], verticesTop[a]);
        var t2_top = subtract(verticesTop[c], verticesTop[b]);
        var normal_top = cross(t1_top, t2_top);
        normal_top = vec4(normal_top);
        
        var t1_bottom = subtract(verticesBottom[b], verticesBottom[a]);
        var t2_bottom = subtract(verticesBottom[c], verticesBottom[b]);
        var normal_bottom = cross(t1_bottom, t2_bottom);
        normal_bottom = vec4(normal_bottom);

        indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesTop[indices[i]] );
            normalsArray.push(normal_top);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesBottom[indices[i]] );
            normalsArray.push(normal_bottom);
        }

        texCoordQuad();
        texCoordQuad();

        // SIDE CAPS
        
        a = (type == 'front') ? 0 : 4;
        b = (type == 'front') ? 1 : 5;
        c = (type == 'front') ? 2 : 6;
        d = (type == 'front') ? 3 : 7;

        var verticesRight = [
            vec4(  v, -v,  v+thickOffset, 1.0 ), // start at front bottom corner
            vec4(  v,  v,  v+thickOffset, 1.0 ),
            vec4(  v,  v,  v-thickOffset, 1.0 ),
            vec4(  v, -v,  v-thickOffset, 1.0 ),
            vec4(  v, -v, -v+thickOffset, 1.0 ), // start at front bottom corner
            vec4(  v,  v, -v+thickOffset, 1.0 ),
            vec4(  v,  v, -v-thickOffset, 1.0 ),
            vec4(  v, -v, -v-thickOffset, 1.0 )
        ];

        var verticesLeft = [
            vec4( -v, -v,  v+thickOffset, 1.0 ), // start at front bottom corner
            vec4( -v,  v,  v+thickOffset, 1.0 ),
            vec4( -v,  v,  v-thickOffset, 1.0 ),
            vec4( -v, -v,  v-thickOffset, 1.0 ),
            vec4( -v, -v, -v+thickOffset, 1.0 ), // start at front bottom corner
            vec4( -v,  v, -v+thickOffset, 1.0 ),
            vec4( -v,  v, -v-thickOffset, 1.0 ),
            vec4( -v, -v, -v-thickOffset, 1.0 )
        ];

        var t1_left = subtract(verticesLeft[b], verticesLeft[a]);
        var t2_left = subtract(verticesLeft[c], verticesLeft[b]);
        var normal_left = cross(t1_left, t2_left);
        normal_left = vec4(normal_left);
        
        var t1_right = subtract(verticesRight[b], verticesRight[a]);
        var t2_right = subtract(verticesRight[c], verticesRight[b]);
        var normal_right = cross(t1_right, t2_right);
        normal_right = vec4(normal_right);

        var indices = [ a, b, c, a, c, d ];
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesLeft[indices[i]] );
            normalsArray.push(normal_left);
        }
        for ( var i = 0; i < indices.length; ++i ) {
            pointsArray.push( verticesRight[indices[i]] );
            normalsArray.push(normal_right);
        }

        texCoordQuad();
        texCoordQuad();
    }
}

function newMaze(x, y) {

    // Establish variables and starting grid
    var totalCells = x*y;
    var cells = new Array();
    var unvis = new Array();
    for (var i = 0; i < y; i++) {
        cells[i] = new Array();
        unvis[i] = new Array();
        for (var j = 0; j < x; j++) {
            cells[i][j] = [0,0,0,0];
            unvis[i][j] = true;
        }
    }
    
    // Set a random position to start from
    var currentCell = [Math.floor(Math.random()*y), Math.floor(Math.random()*x)];
    var path = [currentCell];
    unvis[currentCell[0]][currentCell[1]] = false;
    var visited = 1;
    
    // Loop through all available cell positions
    while (visited < totalCells) {
        // Determine neighboring cells
        var pot = [[currentCell[0]-1, currentCell[1], 0, 2],
                [currentCell[0], currentCell[1]+1, 1, 3],
                [currentCell[0]+1, currentCell[1], 2, 0],
                [currentCell[0], currentCell[1]-1, 3, 1]];
        var neighbors = new Array();
        
        // Determine if each neighboring cell is in game grid, and whether it has already been checked
        for (var l = 0; l < 4; l++) {
            if (pot[l][0] > -1 && pot[l][0] < y && pot[l][1] > -1 && pot[l][1] < x && unvis[pot[l][0]][pot[l][1]]) { neighbors.push(pot[l]); }
        }
        
        // If at least one active neighboring cell has been found
        if (neighbors.length) {
            // Choose one of the neighbors at random
            var next = neighbors[Math.floor(Math.random()*neighbors.length)];
            
            // Remove the wall between the current cell and the chosen neighboring cell
            cells[currentCell[0]][currentCell[1]][next[2]] = 1;
            cells[next[0]][next[1]][next[3]] = 1;
            
            // Mark the neighbor as visited, and set it as the current cell
            unvis[next[0]][next[1]] = false;
            visited++;
            currentCell = [next[0], next[1]];
            path.push(currentCell);
        }
        // Otherwise go back up a step and keep going
        else {
            currentCell = path.pop();
        }
    }
    return cells;
}

function MazeSquare(x,y,z,type) {

    // Places grid square where it should be in the grid
    this.placementMatrix = translate(x*spacing, y*spacing, z*spacing);

    // Type of wall i.e. front back bottom
    this.type = type;

    // World matrix is just the placement matrix, don't need to do anything else with grid
    this.getWorldMatrix = function() {
        return this.placementMatrix;
    }
}

function Maze() {
    
    this.squares = [];

    // For each location in the maze, check if there is a wall on each side
    this.isFrontWall = [];
    this.isBackWall = [];
    this.isLeftWall = [];
    this.isRightWall = [];

    this.clear = function() {
        this.squares = [];
        this.isFrontWall = [];
        this.isBackWall = [];
        this.isLeftWall = [];
        this.isRightWall = [];
    }

    this.init = function() {

        this.squares = new Array(mazeArray.length);

        // Initialize wall check arrays
        this.isFrontWall = new Array(mazeArray.length);
        this.isBackWall = new Array(mazeArray.length);
        this.isLeftWall = new Array(mazeArray.length);
        this.isRightWall = new Array(mazeArray.length);

        var y = 0;
        for (var z = 0; z < mazeArray.length; ++z) {

            this.squares[z] = new Array(mazeArray[0].length);

            // Initialize 2nd dimension of wall check arrays 
            this.isFrontWall[z] = new Array(mazeArray[0].length);
            this.isBackWall[z] = new Array(mazeArray[0].length);
            this.isLeftWall[z] = new Array(mazeArray[0].length);
            this.isRightWall[z] = new Array(mazeArray[0].length);

            for (var x = 0; x < mazeArray[0].length; ++x) {

                this.squares[z][x] = new Array(5); // 5 elements for each face
                // 0-back, 1-right, 2-front, 3-back, 4-bottom

                // First populate check flags with false, replace with true if wall is found
                this.isFrontWall[z][x] = false;
                this.isBackWall[z][x] = false;
                this.isLeftWall[z][x] = false;
                this.isRightWall[z][x] = false;

                //console.log(mazeArray[z][x])
                // Maze bottom exists for each location
                var square = new MazeSquare(x,y,z,'bottom');
                this.squares[z][x][4] = square;
                // Back wall
                if (mazeArray[z][x][0] == 0) {//{ $('#'+selector).css('border-top', '2px solid black'); }
                    // If not at edge
                    if (z > 0) {
                        // Avoid back generation
                        // Check if spot behind has a wall in front
                        if (mazeArray[z-1][x][2] == 1) {
                            square = new MazeSquare(x,y,z,'back');
                            this.squares[z][x][0] = square;
                        }
                    } else {
                        square = new MazeSquare(x,y,z,'back');
                        this.squares[z][x][0] = square;
                    }
                    this.isBackWall[z][x] = true;
                }
                // Right wall
                if (mazeArray[z][x][1] == 0) {//{ $('#'+selector).css('border-right', '2px solid black'); }
                    // Forward generation, no check
                    square = new MazeSquare(x,y,z,'right');
                    this.squares[z][x][1] = square;
                    this.isRightWall[z][x] = true;
                }
                // Front wall
                if (mazeArray[z][x][2] == 0) {//{ $('#'+selector).css('border-bottom', '2px solid black'); }
                    // Forward generation, no check
                    square = new MazeSquare(x,y,z,'front');
                    this.squares[z][x][2] = square;
                    this.isFrontWall[z][x] = true;
                }
                // Left wall
                if (mazeArray[z][x][3] == 0) {//{ $('#'+selector).css('border-left', '2px solid black'); }
                    // If not at edge
                    if (x > 0) {
                        // Avoid back generation
                        // Check if spot to the left has a wall at right
                        if (mazeArray[z][x-1][1] == 1) {
                            square = new MazeSquare(x,y,z,'left');
                            this.squares[z][x][3] = square;
                        }
                    } else {
                        square = new MazeSquare(x,y,z,'left');
                        this.squares[z][x][3] = square;
                    }
                    this.isLeftWall[z][x] = true;
                }
            }
        }
    }
}
var maze = new Maze();

function triangle(a, b, c) {

     var t1 = subtract(b, a);
     var t2 = subtract(c, a);
     var normal = normalize(cross(t2, t1));
     normal = vec4(normal);

     normalsArray.push(normal);
     normalsArray.push(normal);
     normalsArray.push(normal);

     pointsArray.push(a);
     pointsArray.push(b);
     pointsArray.push(c);

     texCoordsArray.push( texCoord[0] );
     texCoordsArray.push( texCoord[0] );
     texCoordsArray.push( texCoord[0] );

     index += 3;
}


function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

// LOOK AT ME
function enqueueAction(action,direction) {
    actionQueue.push([action,direction]);
    dequeueAction();
}

function dequeueAction() {
    if (actionQueue.length == 0) {
        return;
    }
    var nextAction = actionQueue.shift();
    currentAction = nextAction[0];
    if (currentAction == 'translation') {
        translationDir = nextAction[1];
    }
}

var equalVector = function(v1, v2) {
    for (var i = 0; i < 3; ++i) {
        if (v1[i] != v2[i]) {
            return false;
        }
    }
    return true;
}

var winStatus = false;

var checkWin = function() {
    var endZ = mazeArray.length - 1;
    var endX = mazeArray[0].length - 1;
    if (equalVector(spherePosition, vec3(endX,0,endZ))) {
        winStatus = true;
    }
}

// LOOK AT ME
function initEventLister() {
    document.onkeydown = function(e) {
        switch (e.keyCode) {
            case 39: // right arrow, move right
                if (!e.shiftKey) {
                    enqueueAction('translation','right');
                }
                e.preventDefault();
                break;

            case 37: // left arrow, move left
                if (!e.shiftKey) {
                    enqueueAction('translation','left');
                }
                e.preventDefault();
                break;

            case 38: // up arrow
                if (!e.shiftKey) {
                    //enqueueAction('translation','up');
                    enqueueAction('translation','back');
                }
                e.preventDefault();
                break;

            case 40: // down arrow, move down
                if (!e.shiftKey) {
                    //enqueueAction('translation','down');
                    enqueueAction('translation','front');
                }
                e.preventDefault();
                break;

            case 90: // Z, move front
                if (!e.shiftKey) {
                    //enqueueAction('translation','front');
                }
                e.preventDefault();
                break;

            case 88: // X, move back
                if (!e.shiftKey) {
                    //enqueueAction('translation','back');
                }
                e.preventDefault();
                break;
        }
    }

    // Checks if mouse button is held
    var heldDown = false;

    var startX, startY;

    canvas.addEventListener("mousedown", function(e) {
        heldDown = true;
        // Keep track of starting x and y positions
        startX = e.pageX;
        startY = e.pageY;
        e.preventDefault();
        return false;
    });

    canvas.addEventListener("mouseup", function(e) {
        heldDown = false;
    });

    canvas.addEventListener("mousemove", function(e) {
        // If mouse isn't held down, nothing happens
        if (!heldDown) {
            return false;
        }
        // Otherwise, if mouse is held down, rotate the cube if dragged/
        // First find the distance between the old and new mouse positions
        // Then convert into radians by comparing it with the canvas dimensions
        // Negative d means counterclockwise
        dTHETA = (e.pageX-startX)*2*Math.PI/canvas.width;
        dPHI = (e.pageY-startY)*2*Math.PI/canvas.height;

        // Subtract PHI first, then check for discontinuity (otherwise flip glitch)
        PHI = (PHI-dPHI)%(2*Math.PI);

        // From degrees(PHI) E [-180, 0] U [180, 360], the up vector begins to point in
        // the opposite direction and the cube flips to preserve the up direction.
        // We don't want this to happen, so we flip the up vector when this happens
        // (also changes direction of rotation for THETA).
        if ((PHI > Math.PI && PHI < 2*Math.PI) || (PHI < 0 && PHI > -Math.PI)) {
            up = vec3(0.0, -1.0, 0.0);
            THETA = (THETA+dTHETA)%(2*Math.PI);
        } else {
            up = vec3(0.0, 1.0, 0.0);
            THETA = (THETA-dTHETA)%(2*Math.PI);
        }

        // Save ending position as next starting position
        startX = e.pageX;
        startY = e.pageY;
        e.preventDefault();
    });

    canvas.addEventListener("mousewheel", function(e) {
        // Restrict to minimum and maximum zoom windows
        if (cameraRadius - e.wheelDelta/75 < cameraRadiusMin) {
            cameraRadius = cameraRadiusMin;
        } else if (cameraRadius - e.wheelDelta/75 > cameraRadiusMax) {
            cameraRadius = cameraRadiusMax;
        // If restrictions are not met, just zoom in or out
        } else {
            cameraRadius -= e.wheelDelta/75;
        }
    });
}

window.onload = function init() {

    // LOOK AT ME2
    mazeArray = newMaze(10,10);
    maze.init();

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    // Push in points
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    // For maze, need side walls and bottom
    quad( 3, 0, 4, 7, v); // bottom face
    //quad( 2, 3, 7, 6, v); // right face
    //quad( 5, 4, 0, 1, v); // left face
    thickQuad('right', v); // right face
    thickQuad('left', v); // left face
    //quad( 1, 0, 3, 2, v); // front face
    //quad( 4, 5, 6, 7, v); // back face
    thickQuad('front', v); // front face
    thickQuad('back', v); // back face

    // Populate color array AFTER determining final value of index
    colorsArray = new Array(index+150);
    // ball
    for (var i = 0; i < index; ++i) {
        colorsArray[i] = colorTable['red'];    
    }
    // bottom
    for (var i = index; i < index+6; ++i) {
        colorsArray[i] = colorTable['cyan'];    
    }
    // walls
    for (var i = index+6; i < index+150; ++i) {
        colorsArray[i] = colorTable['gray'];   
    }

    //console.log(pointsArray, colorsArray, normalsArray)
    // NORMALS
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    // VERTICES
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // COLORS
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    // TEXTURES
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    // LOoK AT ME
    worldViewMatrixLoc = gl.getUniformLocation( program, "worldViewMatrix" );

    // LOOK AT ME
    initEventLister();

    gl.uniform4fv( gl.getUniformLocation(program,
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
       "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program,
       "shininess"),materialShininess );

    configureTexture(image2);

    timer();
    render();
}

function render() {

    if (winStatus){

        Player1Ref.update({
           "status1": true,
           "time1": minutes + ":" + seconds 
        });

        //console.log(childData);
        alert("NICE WORK! You cleared this maze in " + minutes + " minute(s) and " + seconds +" seconds" + ". Click OK to proceed to the next level."); 
        winStatus = false;
        //alert("??");
        //alert("NICE WORK! You cleared this maze in " + minutes + " minute(s) and " + seconds +" seconds" + ". Click OK to proceed to the next level."); 
        
        mazelength++;
        mazewidth++;
        mazeArray = newMaze(mazelength, mazewidth);
        maze.clear();
        maze.init();

        originZ = (mazeArray.length)/2;
        originX = (mazeArray[0].length)/2; 
        at = vec3(originX, originY, originZ);
        lightPosition = vec4( 0, originY+15.0, 0, 0.0 );

        spherePosition = vec4(0,0,0,1);
        sphereTranslationMatrix = mat4();

        clearTimeout(t);
        h2.textContent = "00:00:00";
        seconds = 0; minutes = 0; hours = 0;
        timer();

        //location.reload();
    }

    if (!winStatus){
        Player1Ref.update({
           "status1": 0,
           "time1": 0
        });

        var query = firebase.database().ref("Winstate/").orderByKey();
            query.once("value")
              .then(function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                  // key will be "ada" the first time and "alan" the second time
                  var key = childSnapshot.key;
                  // childData will be the actual contents of the child
                  var childData = childSnapshot.val();
                  //console.log(childData);
                  //console.log(childData.status1);
                  if(childData.status2){
                    alert("Player 2 wins");
                    Player2Ref.update({
                       "status2": 0,
                       "time2": 0
                    });
                }
                  
              });
            });
    }



    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(cameraRadius*Math.sin(PHI)*Math.sin(THETA)+originX,
        cameraRadius*Math.cos(PHI)+originY,
        cameraRadius*Math.sin(PHI)*Math.cos(THETA)+originZ);

    modelViewMatrix = lookAt(eye, at , up);
    //projectionMatrix = ortho(left, right, bottom, ytop, near, far)
    projectionMatrix = perspective(fovy, aspect, near, far);
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );

    // ----------------
    // Render the maze
    // ----------------
    maze.squares.forEach(function(row) {
        row.forEach(function(column) {
            column.forEach(function(square) {

                // Reset world view matrix
                worldViewMatrix = mat4(); 

                // Get the square's world view matrix
                worldViewMatrix = mult(square.getWorldMatrix(), worldViewMatrix);
                gl.uniformMatrix4fv(worldViewMatrixLoc, false, flatten(worldViewMatrix));

                if (square.type == 'bottom') {
                    gl.drawArrays(gl.TRIANGLES, index, 6);
                } else if (square.type == 'right') {
                    gl.drawArrays(gl.TRIANGLES, index+6, 36);
                } else if (square.type == 'left') {
                    gl.drawArrays(gl.TRIANGLES, index+42, 36);
                } else if (square.type == 'front') {
                    gl.drawArrays(gl.TRIANGLES, index+78, 36);
                } else if (square.type == 'back') {
                    gl.drawArrays(gl.TRIANGLES, index+114, 36);
                }
            });
        });
    });

    // ----------------
    // Render the ball
    // ----------------

    // Check if anything in action queue
    if (currentAction == 'translation') {
        var currX = spherePosition[0];
        var currZ = spherePosition[2];
        // Apply incremental translation to cumulative translation matrix first
        if (translationDir == 'left' && !maze.isLeftWall[currZ][currX]) {
            sphereTranslationMatrix = mult(translate(-1,0,0), sphereTranslationMatrix);
        } else if (translationDir == 'right' && !maze.isRightWall[currZ][currX]) {
            sphereTranslationMatrix = mult(translate(1,0,0), sphereTranslationMatrix);
        } else if (translationDir == 'up') {
            sphereTranslationMatrix = mult(translate(0,1,0), sphereTranslationMatrix);
        } else if (translationDir == 'down') {
            sphereTranslationMatrix = mult(translate(0,-1,0), sphereTranslationMatrix);
        } else if (translationDir == 'front' && !maze.isFrontWall[currZ][currX]) {
            sphereTranslationMatrix = mult(translate(0,0,1), sphereTranslationMatrix);
        } else if (translationDir == 'back' && !maze.isBackWall[currZ][currX]) {
            sphereTranslationMatrix = mult(translate(0,0,-1), sphereTranslationMatrix);
        }
        // Update sphere position relative to origin (not doing anything with this yet)
        spherePosition = mult(sphereTranslationMatrix, vec4(0,0,0,1));
        checkWin();
        currentAction = 'none';
        dequeueAction();
    }

    // Change the world view matrix for sphere (make sure to initialize it to identity first)
    worldViewMatrix = mat4();
    worldViewMatrix = mult(sphereTranslationMatrix, worldViewMatrix);
    gl.uniformMatrix4fv(worldViewMatrixLoc, false, flatten(worldViewMatrix));

    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}
