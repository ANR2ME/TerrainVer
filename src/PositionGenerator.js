import convolution from '../libs/webglConvolution.js'
import { timer } from './utils.js'

const DEFAULT_OPTIONS = {
  marginTop: 40,  // don't generate position too high
  marginRight: 1,
  marginBottom: 60,  // don't generate position in water
  marginLeft: 1,
  seed: Math.random()
}

// Use Halton sequence to generate positions
// https://en.wikipedia.org/wiki/Halton_sequence
// This will return a number between [0,1)
function halton (index, base) {
  let result = 0
  let f = 1 / base
  let i = index
  while (i > 0) {
    result = result + f * (i % base)
    i = Math.floor(i / base)
    f = f / base
  }
  return result
}

// Square distance between 2 points
function dist2 (a,b) {
  return Math.pow(b[0]-a[0],2) + Math.pow(b[1]-a[1],2);
}

// Generate pseudo-random(uniformly distributed) positions on a the surface of a given terrain
export default class PositionGenerator {

  constructor (terrainShape, opts) {
    timer.start("PositionGenerator")
    // Check options values
    this.options = Object.assign({}, DEFAULT_OPTIONS, opts)
    if (this.options.seed < 0 || this.options.seed >= 1) {
      throw new Error('Invalid seed: ' + this.options.seed + ', must be between [0,1).')
    }
    
    const surfaceImg = new ImageData(terrainShape.width, terrainShape.height)
    convolution(['surface','threshold','surfaceErosion','surfaceErosion','surfaceErosion'], terrainShape, surfaceImg)    
    
    // Compute the surface points of the terrain
    let surfacePoints = []
    const w = surfaceImg.width
    const h = surfaceImg.height
    for (let y = this.options.marginTop; y < h - this.options.marginBottom; y++) {
      for (let x = this.options.marginLeft; x < w - this.options.marginRight; x++) {
        if (surfaceImg.data[(x + y * w) * 4] !== 0 ) {
          surfacePoints.push([x, y])
        }
      }
    }

    // Sort points by location using a simple march-through algorithm
    // Start at bottom left and march through closest surfacePoints
    let curr = [0,h-1];
    const visited = [];
    while (surfacePoints.length > 0) {
      // Sort remaining points by distance to current
      if (dist2(curr,surfacePoints[surfacePoints.length - 1]) > 25) {
        surfacePoints.sort ((a, b) => dist2(curr,b) - dist2(curr,a));
      }
      curr = surfacePoints.pop();
      visited.push(curr);
    }
    
    this.surfacePoints = visited
    this.haltonIndex = 0
    timer.stop("PositionGenerator")
  }

  // Return next random surface point
  getSurfacePoint () {
    let nextRandomNb = halton(this.haltonIndex++, 2)
    // randomize halton sequence by using the random seed as an offset
    nextRandomNb = (nextRandomNb + this.options.seed) % 1.0
    return this.surfacePoints[Math.floor(nextRandomNb * this.surfacePoints.length)]
  }
  
  drawSurfacePoints (terrainCanvas) {
    const ctx = terrainCanvas.getContext('2d')
    ctx.fillStyle = "rgba(255,0,0,1)";
    for (let curr = 0; curr < this.surfacePoints.length; curr++) {
      let currPt = this.surfacePoints[curr]
      ctx.fillRect( currPt[0], currPt[1], 1, 1 )
    }
  }
}
