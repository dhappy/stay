import React, { useState, useEffect, createRef } from 'react'
import { TweenMax, Power3 } from 'gsap/all'
import './App.css'
import Property from './property.svg'

export default () => {
  const [doc, setDoc] = useState()
  const [origBBox, setOrigBBox] = useState()
  const svg = createRef()

  const cleanAttributes = (attributes) => {
    const attrs = {}
    for(let attr of attributes) {
      attrs[attr.nodeName] = attr.nodeValue
    }

    if(attrs.style) {
      const style = {}
      for(let elem of attrs.style.split(';')) {
        let [prop, val] = elem.split(':')
        prop = (
          prop.split('-')
          .map((part, i) => {
            if(i === 0) {
              return part
            } else {
              return part[0].toUpperCase() + part.slice(1)
            }
          })
          .join('')
        )
        style[prop] = val
      }
      attrs.style = style
    }

    if(attrs.class) {
      attrs.className = attrs.class
      delete attrs.class
    }
    if(attrs['xml:space']) {
      attrs.xmlSpace = attrs['xml:space']
      delete attrs['xml:space']
    }

    return attrs
  }

  const buildTree = (root, key = 0) => {
    if(root.nodeType !== Node.ELEMENT_NODE) {
      console.error('Root Type', root.nodeType)
    } else {
      const children = []
      for(let child of root.childNodes) {
        if(child.nodeType === Node.ELEMENT_NODE) {
          if([...child.childNodes].find(
            sub => sub.nodeType !== Node.TEXT_NODE
          )) {
            children.push(buildTree(child, ++key))
          } else {
            const attrs = cleanAttributes(child.attributes)
            attrs.key = ++key

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
      attrs.key = ++key

      if(['parent', 'space'].includes(attrs.className)) {
        const ref = createRef()
        attrs.ref = ref
        attrs.onClick = () => {
          const current = svg.current.attributes.viewBox.nodeValue
          if(!origBBox) {
            setOrigBBox(current)
          }
          const bbox = ref.current.getBBox()

          try {
            
            const tfm2elm = (
              svg.current.getScreenCTM().inverse().multiply(ref.current.getScreenCTM())
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
            let newView = [origin.x, origin.y, dest.x, dest.y].join(' ')
            if(current === newView) {
              newView = origBBox
            }
            TweenMax.to(
              svg.current, 1, { attr: { viewBox: newView }, ease: Power3.easeInOut }
            )
          } catch(e) {
            console.error(e)
          }
        }
      }

      if(['parent'].includes(attrs.className)) {
        attrs.onDoubleClick = () => {
          console.info('DBL')
        }
      }

      if(root.nodeName === 'svg') {
        attrs.ref = svg
      }

      return React.createElement(
        root.nodeName, attrs, children
      )
    }
  }

  const loadDoc = async () => {
    const res = await fetch(Property)
    const doc = await res.text()
    setDoc(doc)
  }

  useEffect(() => { loadDoc() }, [])

  let SVG
  if(doc) {
    const dom = (new DOMParser()).parseFromString(doc, 'text/xml')
    SVG = buildTree(dom.documentElement)
  }

  return (
    <div className='App' style={{height: '100vh'}}>
      {SVG}
    </div>
  )
}
