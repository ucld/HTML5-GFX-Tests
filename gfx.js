'strict mode'
/*
Graphics: {
  ...,
  width: (short)
  height: (short)
  sprites: (sprite)[]
}
Sprite: {
  x: (int)
  y: (int)
  w: (int)
  h: (int)
  image: null
  sprites: (sprite)[]
}
Image: {
  x: (int)
  y: (int)
  w: (int)
  h: (int)
  sx: (int)
  sy: (int)
  sw: (int)
  sh: (int)
  src: (string)
}
*/
function typedVar (type, variable) {
  const actualType = (
    typeof variable === 'object'
      ? variable.constructor.name : typeof variable
  )
  if (actualType !== type) {
    throw Error('Expected type: ' + type + ', got type: ' + actualType)
  }
  return variable
}

function typedFn (type, fn) {
  const reg = /^\s?(.*?)\s?->\s?([A-Za-z0-9]*)\s?$/
  if (reg.test(type)) {
    const tokens = type.match(reg).slice(1)
    const fnArgs = tokens[0].replace(/\s+/g, '').split(',').filter(i => i)
    const fnRetn = tokens[1] === '' ? 'undefined' : tokens[1]

    return (...args) => {
      if (args.length !== fnArgs.length) {
        throw Error(
          'Expected: ' + fnArgs.length + ' arguments, got ' + args.length
        )
      }
      for (const i in args) {
        typedVar(fnArgs[i], args[i])
      }
      const result = fn(...args)
      return typedVar(fnRetn, result)
    }
  } else {
    throw Error('Bad definition: ' + type)
  }
}

function GFX (id, width, height) {
  this.c = document.createElement('CANVAS')
  this.ctx = this.c.getContext('2d')
  document.querySelector(id).appendChild(this.c)
  this.c.width = width
  this.c.height = height

  Object.assign(this, {
    width: width,
    height: height,
    sprites: [],
    files: [],
    fps: 24
  })

  // Subclass
  function Sprite (image, x, y, w, h) {
    Object.assign(this, {
      x: x,
      y: y,
      w: w,
      h: h,
      state: 0,
      frame: 0,
      image: image,
      sprites: []
    })
    return this
  }

  function Img (id, x, y, w, h, sx, sy, sw, sh) {
    Object.assign(this, {
      x: x,
      y: y,
      w: w,
      h: h,
      sx: sx,
      sy: sy,
      sw: sw,
      sh: sh,
      src: id
    })
    return this
  }

  // Private
  const emptyPromise = () => new Promise(resolve => resolve(this))
  const findSource = typedFn(
    'string -> number',
    src => {
      for (let i = 0; i < this.files.length; i++) {
        if (this.files[i].src === src) {
          return i
        }
      }
      return -1
    }
  )

  // Public
  this.loadSource = typedFn(
    'string -> Promise',
    src => new Promise(resolve => {
      const find = findSource(src)
      if (find !== -1) {
        resolve(find)
      } else {
        const image = new Image()
        image.src = src
        image.onload = () => {
          this.files.push(image)
          resolve(this.files.length - 1)
        }
      }
    })
  )

  // Should create new sprites
  this.loadSprite = typedFn(
    'string, number, number, number, number -> Promise',
    (src, x, y, w, h) => new Promise(resolve => {
      this.loadSource(src).then(id => {
        const container = new Sprite(null, x, y, w, h)
        const xFrames = this.files[id].width / w
        const yFrames = this.files[id].height / h
        const totalFrames = xFrames * yFrames
        if (xFrames === 1 && yFrames === 1) {
          container.image = new Img(
            id, 0, 0, w, h, x, y, w, h
          )
        } else {
          for (let i = 0; i < totalFrames; i++) {
            const x = i % xFrames
            const y = Math.floor(i / xFrames)
            container.sprites.push(
              new Sprite(
                new Img(
                  id, 0, 0, w, h, x * w, y * h, w, h
                ), 0, 0, w, h
              )
            )
          }
        }
        this.sprites.push(container)
        return resolve(this)
      })
    })
  )

  this.loadText = typedFn(
    'string, number, number -> Promise',
    (text, x, y) => new Promise(resolve => {
      this.loadSource('11x16_Linux_Libertine_Mono_O.png').then(id => {
        const container = new Sprite(null, x, y, 11, 16)
        const characters = text.split('')
        const w = container.w
        const h = container.h
        let dx = 0
        let dy = 0
        for (let i = 0; i < characters.length; i++) {
          const charCode = text.charCodeAt(i) - 33
          if (text[i] === '\t') {
            dx += w * 4
          } else if (text[i] === '\n') {
            dy += h
            dx = -w
          } else if (charCode > -1 && charCode < 94) {
            container.sprites.push(
              new Sprite(
                new Img(
                  id, dx, dy, w, h,
                  charCode * w, 0, w, h
                ), 0, 0, w, h
              )
            )
          }
          dx += w
        }
        container.state = 2
        this.sprites.push(container)
        return resolve(this)
      })
    })
  )

  this.coordStack = []
  this.spriteStack = []
  this.renderFrame = () => {
    this.coordStack.length = 0
    this.spriteStack.length = 0
    for (let i = 0; i < this.sprites.length; i++) {
      this.spriteStack.push(this.sprites[i])
      this.coordStack.push(0)
      this.coordStack.push(0)
    }

    this.ctx.clearRect(0, 0, this.width, this.height)
    while (this.spriteStack.length > 0) {
      const current = typedVar('Sprite', this.spriteStack.pop())
      const dx = typedVar('number', this.coordStack.pop())
      const dy = typedVar('number', this.coordStack.pop())

      if (current.image) {
        const image = typedVar('Img', current.image)
        this.ctx.drawImage(
          this.files[image.src],
          image.sx, image.sy, image.w, image.h,
          current.x + dx + image.x,
          current.y + dy + image.y,
          image.w, image.h
        )
      } else if (current.state === 0) { // & 1
        this.spriteStack.push(current.sprites[current.frame])
        this.coordStack.push(current.y)
        this.coordStack.push(current.x)
        current.frame = (current.frame + 1) % current.sprites.length
      } else if (current.state === 1) {
        this.spriteStack.push(current.sprites[current.frame])
        this.coordStack.push(current.y)
        this.coordStack.push(current.x)
      } else if (current.state === 2) {
        for (let i = 0; i < current.sprites.length; i++) {
          this.coordStack.push(current.y)
          this.coordStack.push(current.x)
          this.spriteStack.push(current.sprites[i])
        }
      }
    }
  }

  this.lastTime = 0
  this.mainLoop = () => {}
  this.renderLoop = () => {
    const interval = 1000 / this.fps
    const currentTime = performance.now()
    const difference = currentTime - this.lastTime

    if (difference > interval) {
      this.renderFrame()
      this.lastTime = currentTime
      this.mainLoop(this.sprites)
    }
    requestAnimationFrame(boundedThrottle)
  }
  // Prevents allocation on runtime
  const boundedThrottle = this.renderLoop.bind(this)

  this.render = fn => {
    this.mainLoop = fn || this.mainLoop
    this.renderLoop()
    return emptyPromise()
  }

  return emptyPromise()
}
