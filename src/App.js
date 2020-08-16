import React, { useState, useEffect, createRef, useRef } from 'react'
import { TweenMax, Power3 } from 'gsap/all'
import './App.css'

export default () => {
  const [files, setFiles] = useState(['survey.svg'])
  const [doc, setDoc] = useState()
  const origView = useRef(null)
  const [SVG, setSVG] = useState()
  const keys = useRef([])
  const elems = useRef({})
  const svg = createRef()
  const [tooltip, setTooltip] = useState()

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
      // toggle spaces visibility
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

      const ref = createRef()
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
            svg.current, 0.3, { attr: { viewBox: newView }, opacity: 0, ease: Power3.easeInOut, onComplete: () => setFiles(f => [attrs.xlinkHref, ...f])}
          )
        }
      }

      if(attrs.style && attrs.style.display === 'none') {
        attrs.style.opacity = 0
      }

      if(attrs['inkscape:label']) {
        children.unshift(<title key={++key.val}>{attrs['inkscape:label']}</title>)
      }

      if(['key'].includes(attrs.className)) {
        keys.current.push(attrs.ref)
        attrs.onClick = (evt) => clickShow(evt.target, attrs.ref.current)
      }

      if(['link'].includes(attrs.className)) {
        console.info('link', root.id, attrs.xlinkHref)
        attrs.onClick = () => {
          const dest = attrs.xlinkHref
          if(dest.startsWith('#')) {
            setKeyTo(dest)
          } else {
            setFiles(fs => [dest, ...fs])
          }
        }
      }

      if(root.nodeName === 'svg') {
        attrs.ref = svg
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
            setTooltip(node.attributes['inkscape:label'].nodeValue)
            setTimeout(() => setTooltip(), 5000)
          }
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
      const dom = (new DOMParser()).parseFromString(doc, 'text/xml')
      keys.current = []
      origView.current = dom.documentElement.attributes.viewBox.nodeValue
      elems.current = {}
      setSVG(buildTree(dom.documentElement, elems.current))
    }  
  }, [doc])

  useEffect(() => {
    for(let key of keys.current) {
      for(let anchor of [...key.current.childNodes]) {
        if(!anchor.attributes) continue
        const id = anchor.attributes['xlink:href'].nodeValue.replace(/^#/, '')
        console.info('checking', anchor.id, id, elems.current[id].current.style.opacity)
        if(elems.current[id].current.style.opacity !== '0') {
          setKeyTo(id)
        }
      }
    }
  }, [SVG])

  return (
    <div className='App' style={{height: '100vh'}}>
      {SVG}
      {tooltip && <h1>{tooltip}</h1>}
      {files.length > 1 && <a id='back' onClick={back}>❌</a>}
    </div>
  )
}
