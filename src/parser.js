import JSZip from 'jszip'

export async function parseFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.stl')) return parseStl(file)
  if (name.endsWith('.3mf')) return parse3mf(file)
  throw new Error('Unsupported file type: ' + file.name)
}

async function parseStl(file) {
  const buffer = await file.arrayBuffer()
  const triangles = isBinaryStl(buffer) ? parseBinaryStl(buffer) : parseAsciiStl(buffer)
  return Math.abs(signedVolumeMm3(triangles)) / 1000
}

function isBinaryStl(buffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  return buffer.byteLength === 84 + count * 50 && count > 0
}

function parseBinaryStl(buffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  const triangles = []
  let o = 84
  for (let i = 0; i < count; i++) {
    o += 12
    const v1 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    const v2 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    const v3 = [view.getFloat32(o,true), view.getFloat32(o+4,true), view.getFloat32(o+8,true)]; o += 12
    o += 2
    triangles.push([v1, v2, v3])
  }
  return triangles
}

function parseAsciiStl(buffer) {
  const text = new TextDecoder().decode(buffer)
  const re = /^\s*vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/gm
  const triangles = []
  const verts = []
  let m
  while ((m = re.exec(text)) !== null) {
    verts.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])])
    if (verts.length === 3) { triangles.push([...verts]); verts.length = 0 }
  }
  return triangles
}

function signedVolumeMm3(triangles) {
  let v = 0
  for (const [v1, v2, v3] of triangles) {
    v += (v1[0]*(v2[1]*v3[2]-v2[2]*v3[1])
        + v1[1]*(v2[2]*v3[0]-v2[0]*v3[2])
        + v1[2]*(v2[0]*v3[1]-v2[1]*v3[0])) / 6
  }
  return v
}

async function parse3mf(file) {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const modelFile = zip.file('3D/3dmodel.model')
  if (!modelFile) throw new Error('Invalid 3MF: missing 3D/3dmodel.model')
  const xml = await modelFile.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  const NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
  const vertices = Array.from(doc.getElementsByTagNameNS(NS, 'vertex')).map(el => [
    parseFloat(el.getAttribute('x')),
    parseFloat(el.getAttribute('y')),
    parseFloat(el.getAttribute('z'))
  ])

  const triangles = Array.from(doc.getElementsByTagNameNS(NS, 'triangle')).map(el => [
    vertices[parseInt(el.getAttribute('v1'))],
    vertices[parseInt(el.getAttribute('v2'))],
    vertices[parseInt(el.getAttribute('v3'))]
  ])

  return Math.abs(signedVolumeMm3(triangles)) / 1000
}
