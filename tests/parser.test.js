import { describe, it, expect } from 'vitest'
import { parseFile } from '../src/parser.js'

function makeBinaryStl(triangles) {
  const buf = new ArrayBuffer(84 + triangles.length * 50)
  const view = new DataView(buf)
  view.setUint32(80, triangles.length, true)
  let offset = 84
  for (const [v1, v2, v3] of triangles) {
    view.setFloat32(offset, 0, true); offset += 4
    view.setFloat32(offset, 0, true); offset += 4
    view.setFloat32(offset, 0, true); offset += 4
    for (const v of [v1, v2, v3]) {
      view.setFloat32(offset, v[0], true); offset += 4
      view.setFloat32(offset, v[1], true); offset += 4
      view.setFloat32(offset, v[2], true); offset += 4
    }
    view.setUint16(offset, 0, true); offset += 2
  }
  return buf
}

// Tetrahedron: (0,0,0),(10,0,0),(0,10,0),(0,0,10) mm → volume = 1000/6 mm³ = 0.16667 cm³
const TETRA = [
  [[0,0,0],[0,10,0],[10,0,0]],
  [[0,0,0],[10,0,0],[0,0,10]],
  [[0,0,0],[0,0,10],[0,10,0]],
  [[10,0,0],[0,10,0],[0,0,10]],
]

describe('parseFile - binary STL', () => {
  it('returns volume in cm³', async () => {
    const file = new File([makeBinaryStl(TETRA)], 'test.stl')
    expect(await parseFile(file)).toBeCloseTo(0.16667, 3)
  })
})

describe('parseFile - ASCII STL', () => {
  it('returns volume in cm³', async () => {
    const ascii = `solid tetrahedron
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 0 10 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 10
      vertex 10 0 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 10 0
      vertex 0 0 10
    endloop
  endfacet
  facet normal 0.577 0.577 0.577
    outer loop
      vertex 10 0 0
      vertex 0 10 0
      vertex 0 0 10
    endloop
  endfacet
endsolid tetrahedron`
    const file = new File([ascii], 'test.stl')
    expect(await parseFile(file)).toBeCloseTo(0.16667, 3)
  })
})

describe('parseFile - errors', () => {
  it('rejects unsupported file extensions', async () => {
    const file = new File(['data'], 'model.obj')
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type')
  })
})
