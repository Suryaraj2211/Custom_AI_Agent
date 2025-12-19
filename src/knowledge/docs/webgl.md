# WebGL Knowledge Base

## Shader Compilation

### Common Error: Shader compile failed
**Causes:**
1. GLSL version mismatch
2. Precision not specified (WebGL 1)
3. Variable type mismatch

**Fix:**
```glsl
#version 300 es  // WebGL 2
precision highp float;  // Required for WebGL

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
```

## Attribute/Uniform Locations

### Getting Locations
```javascript
const positionLoc = gl.getAttribLocation(program, 'aPosition');
const mvpLoc = gl.getUniformLocation(program, 'uMVP');

// Check for -1 (not found)
if (positionLoc === -1) {
    console.error('Attribute aPosition not found or not used');
}
```

### Common Issue: Uniform Not Found
- Shader optimizer removes unused uniforms
- Check spelling (case-sensitive)
- Ensure uniform is actually used in shader

## Textures

### Power of 2 Textures (WebGL 1)
WebGL 1 requires power-of-2 textures for mipmaps and repeat wrap.

```javascript
// For non-power-of-2 textures
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

### Texture Unit Binding
```javascript
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
gl.uniform1i(diffuseLoc, 0);  // Texture unit 0

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, normalTexture);
gl.uniform1i(normalLoc, 1);  // Texture unit 1
```

## Buffer Management

### Vertex Buffer Setup
```javascript
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, stride, offset);
```

## Performance Tips

1. **Batch draw calls** - Combine meshes when possible
2. **Minimize state changes** - Sort by program, then texture
3. **Use VAOs** - Vertex Array Objects (WebGL 2)
4. **Avoid gl.getError()** in production - It's slow
