import React, { useState, useEffect, createRef, useRef } from 'react'
import { TweenMax, Power3 } from 'gsap/all'
import './App.css'

export default () => {
  const [files, setFiles] = useState(['survey.svg'])
  const [doc, setDoc] = useState()
  const origView = useRef(null)
  const [SVG, setSVG] = useState()
  const keys = useRef([])
  const spaces = useRef([])
  const elems = useRef({})
  const svg = useRef()
  const [tooltip, setTooltip] = useState()
  const tipTimeout = useRef()

  const camelCase = (str, sep = '-') => (
    str.split(sep)
    .map((part, i) => {
      if(i === 0) {
        return part
      } else {
        return part[0].toUpperCase() + part.slice(1)
      }
    })
    .join('')
  )

  const getViewBox = () => {
    const str = svg.current.attributes.viewBox.nodeValue
    const parts = str.split(/\s+/).map(parseFloat)
    return {
      x: parts[0], y: parts[1], width: parts[2], height: parts[3]
    }
  }

  const setViewBox = (box) => {
    if(typeof box !== 'string') {
      box = [box.x, box.y, box.width, box.height].join(' ')
    }
    svg.current.setAttribute('viewBox', box)
  }

  const cleanAttributes = (attributes) => {
    const attrs = {}
    for(let attr of attributes) {
      attrs[attr.nodeName] = attr.nodeValue
    }

    if(attrs.style) {
      const style = {}
      for(let elem of attrs.style.split(';')) {
        let [prop, val] = elem.split(':')
        prop = camelCase(prop, '-')
        style[prop] = val
      }
      attrs.style = style
    }

    if(attrs.class) {
      attrs.className = attrs.class
      delete attrs.class
    }
    for(let attr of ['xml:space', 'xlink:href', 'xmlns:xlink']) {
      if(attrs[attr]) {
        attrs[camelCase(attr, ':')] = attrs[attr]
        delete attrs[attr]
      }
    }
    for(let attr of ['flood-opacity', 'flood-color']) {
      if(attrs[attr]) {
        attrs[camelCase(attr, '-')] = attrs[attr]
        delete attrs[attr]
      }
    }

    return attrs
  }

  const zoomedBox = (elem) => {
    const bbox = elem.getBBox()
    const tfm2elm = (
      svg.current.getScreenCTM().inverse().multiply(elem.getScreenCTM())
    )
    const pad = 2
    let origin = svg.current.createSVGPoint()
    origin.x = bbox.x - pad
    origin.y = bbox.y - pad
    let dest = svg.current.createSVGPoint()
    dest.x = origin.x + bbox.width + 2 * pad
    dest.y = origin.y + bbox.height + 2 * pad
    origin = origin.matrixTransform(tfm2elm)
    dest = dest.matrixTransform(tfm2elm)
    dest.x -= origin.x
    dest.y -= origin.y
    return [origin.x, origin.y, dest.x, dest.y].join(' ')
  }

  const zoomTo = (elem) => {
    let newView = zoomedBox(elem)
    if(newView === svg.current.attributes.viewBox.nodeValue) {
      newView = origView.current
    }
    TweenMax.to(
      svg.current, 1, { attr: { viewBox: newView }, ease: Power3.easeInOut }
    )
  }

  const setKeyTo = (to) => {
    to = to.replace(/^#/, '')
    for(let key of keys.current) {
      const anchors = (
        [...key.current.childNodes]
        .filter(c => c.attributes && c.attributes['xlink:href'])
      )
      const links = (
        anchors
        .map(c => c.attributes['xlink:href'].nodeValue.replace(/^#/, ''))
      )

      if(links.includes(to)) {
        for(let anchor of anchors) {
          if(!anchor.classList) continue

          const id = anchor.attributes['xlink:href'].nodeValue.replace(/^#/, '')
          const elem = elems.current[id] && elems.current[id].current
          const visible = id === to

          if(visible) {
            anchor.classList.add('active')
          } else {
            anchor.classList.remove('active')
          }

          TweenMax.to(
            elem, 0.5, { display: visible ? 'inline' : 'none', opacity: visible ? 1 : 0, ease: Power3.easeInOut }
          )
        }
      }
    }
  }

  const clickShow = (clicked, key) => {
    if(clicked === key) return
    while(clicked.parentNode !== key) {
      clicked = clicked.parentNode
    }
    if([...clicked.classList].includes('active')) {
      // Do what?
    } else {
      setKeyTo(clicked.attributes['xlink:href'].nodeValue)
    }
  }

  const buildTree = (root, elems = {}, key = { val: 0 }) => {
    if(root.nodeType !== Node.ELEMENT_NODE) {
      console.error('Root Type', root.nodeType)
    } else {
      const children = []
      for(let child of root.childNodes) {
        if(child.nodeType === Node.ELEMENT_NODE) {
          if(
            child.childNodes.length === 0
            || [...child.childNodes].find(
              sub => sub.nodeType !== Node.TEXT_NODE
            )
          ) {
            children.push(buildTree(child, elems, key))
          } else {
            const attrs = cleanAttributes(child.attributes)
            attrs.key = ++key.val

            const text = [...child.childNodes].map(c => c.data).join()
            children.push(React.createElement(
              child.nodeName, attrs, text
            ))
          }
        } else if(child.data && child.data.trim() !== '') {
          console.error('Child', child.data)
        }
      }
      const attrs = cleanAttributes(root.attributes)
      attrs.key = ++key.val

      const ref = (root.nodeName === 'svg') ? svg : createRef()
      attrs.ref = ref

      if(attrs.id) {
        elems[attrs.id] = attrs.ref
      }

      if(['space'].includes(attrs.className)) {
        attrs.onClick = () => zoomTo(ref.current)
      }

      if(['parent'].includes(attrs.className)) {
        attrs.onClick = () => {
          const newView = zoomedBox(ref.current)
          TweenMax.to(
            svg.current, 0.5,
            {
              attr: { viewBox: newView },
              ease: Power3.easeOut,
            }
          )
          TweenMax.to(
            svg.current, 0.1,
            {
              opacity: 0,
              ease: Power3.easeInOut,
              delay: 0.4,
              onComplete: () => setFiles(f => [attrs.xlinkHref, ...f])
            }
          )
        }
      }

      if(attrs.style && attrs.style.display === 'none') {
        attrs.style.opacity = 0
      }

      if(attrs['inkscape:label']) {
        children.unshift(<title key={++key.val}>{attrs['inkscape:label']}</title>)
      }

      if(attrs['inkscape:label'] === 'space') {
        spaces.current.push(attrs.ref)
      }

      if(['key'].includes(attrs.className)) {
        keys.current.push(attrs.ref)
        attrs.onClick = (evt) => clickShow(evt.target, attrs.ref.current)
      }

      if(['link'].includes(attrs.className)) {
        attrs.onClick = () => {
          const dest = attrs.xlinkHref
          if(dest.startsWith('#')) {
            setKeyTo(dest)
          } else {
            setFiles(fs => [dest, ...fs])
          }
        }
      }

      if(['toggle'].includes(attrs.className)) {
        const handler = () => {
          attrs.ref.current.classList.toggle('on')
          for(let space of spaces.current) {
            const visible = space.current.style.opacity !== '0'
            TweenMax.to(
              space.current, 0.5,
              {
                display: visible ? 'none' : 'inline',
                opacity: visible ? 0 : 1,
                ease: Power3.easeInOut
              }
            )
          }
        }
        window.addEventListener(
          'keypress', (evt) => { if(evt.key === 's') handler() }
        )
        attrs.onClick = handler
      }

      if(!attrs.onClick) {
        attrs.onClick = (evt) => {
          let node = evt.target
          while(node.parentNode && !node.attributes['inkscape:label']) {
            node = node.parentNode
          }
          if(!node || !node.attributes) {
            setTooltip('')
          } else {
            node.classList.add('clicked')
            setTimeout(() => node.classList.remove('clicked'), 1000)
            setTooltip(node.attributes['inkscape:label'].nodeValue)
            if(tipTimeout.current) {
              clearTimeout(tipTimeout.current)
            }
            tipTimeout.current = setTimeout(() => setTooltip(), 5000)
          }
        }
      }

      if(!attrs.onDoubleClick) {
        attrs.onDoubleClick = (evt) => {
          evt.preventDefault()
          console.log(attrs.ref.current)
        }
      }

      return React.createElement(
        root.nodeName, attrs, children
      )
    }
  }

  const loadDoc = async (filename) => {
    const res = await fetch(filename)
    if(res.status >= 200 && res.status < 300) {
      setDoc(await res.text())
    } else {
      alert(`Couldn't Load: ${filename}`)
    }
  }

  const back = () => {
    setFiles(f => f.slice(1))
  }

  useEffect(() => { loadDoc(files[0]) }, [files])

  useEffect(() => {
    if(doc) {
      try {
        const dom = (new DOMParser()).parseFromString(doc, 'text/xml')
        keys.current = []
        spaces.current = []
        origView.current = dom.documentElement.attributes.viewBox.nodeValue
        elems.current = {}
        setSVG(buildTree(dom.documentElement, elems.current))
      } catch(err) {
        alert(`Error Loading: ${files[0]}`)
        console.error(err)
        console.error(doc)
      }
    }  
  }, [doc]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for(let key of keys.current) {
      for(let anchor of [...key.current.childNodes]) {
        if(!anchor.attributes) continue
        const id = anchor.attributes['xlink:href'].nodeValue.replace(/^#/, '')
        if(elems.current[id].current.style.opacity !== '0') {
          setKeyTo(id)
        }
      }
    }
  }, [SVG])

  useEffect(() => {
    const handler = (evt) => {
      let view = getViewBox()
      const mult = (evt.altKey ? 0.025 : 0.1) * (evt.deltaY / Math.abs(evt.deltaY))
      if(evt.shiftKey) { // pan
        view.x += view.width * mult
      } else if(evt.ctrlKey) { // zoom
        evt.preventDefault()

        const point = svg.current.createSVGPoint()
        point.x = evt.clientX
        point.y = evt.clientY
        const viewPoint = point.matrixTransform(svg.current.getScreenCTM().inverse())
        const d = { x: viewPoint.x - view.x, y: viewPoint.y - view.y }
        const newView = {
          width: view.width * (1 - mult), height: view.height * (1 - mult)
        }
        const dPrime = {
          x: newView.width * (d.x / view.width),
          y: newView.height * (d.y / view.height),
        }
        newView.x = viewPoint.x - dPrime.x
        newView.y = viewPoint.y - dPrime.y
        view = newView
      } else { // scroll
        view.y += view.height * mult
      }
      setViewBox(view)
    }
  
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    const handler = (evt) => {
      if(evt.key === 'Enter') {
        setViewBox(origView.current)
      }
    }
    window.addEventListener('keypress', handler)
    return () => window.removeEventListener('keypress', handler)
  }, [])


  return (
    <div className='App' style={{height: '100vh'}}>
      {SVG}
      {tooltip && <h1>{tooltip}</h1>}
      {files.length > 1 &&
        <button id='back' onClick={back}>
          <span role='img' aria-label='Close'>❌</span>
        </button>
      }
    </div>
  )
}
