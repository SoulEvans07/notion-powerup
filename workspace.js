let jumper = function(el, jumps) {
  let path = [ el ]
  let next = el
  let exit = null

  jumps.some((jump, i) => {
    exit = next
    lastIndex = i

    if (jump >= 0) {
      if (next.childNodes[jump] == null) return true
      next = next.childNodes[jump]
    } else {
      next = next.parentElement
    }
    path.push(next)
  })

  // debug: return { exit: path[path.length-1], lastIndex: path.length-1, path }
  return path[path.length-1]
}


const collection_types = {
  table: 'table',
  board: 'board',
  calendar: 'calendar',
  list: 'list',
  gallery: 'gallery'
}
let selector = '.notion-' + Object.values(collection_types).join('-view, .notion-') + '-view'

let collection_list = Array.from(document.querySelectorAll(selector))
.map(coll => {
  let isInModal = coll.parentElement.parentElement.classList.contains('notion-collection_view-block')
  let type = coll.className.split('notion-')[1].split('-view')[0]
  return { el: coll, type, isInModal }
})
.map(coll => {
  let newColl = { ...coll }
  let jumps = coll.isInModal ? [-1, -1, 0, 0, 0, 0, 0, 0] : [-1, -1, 0, 0, 1, 0, 0, 0]
  
  newColl.title = jumper(coll.el, jumps).nodeValue
  newColl.openAsNewPage = newColl.title.endsWith('  ')

  switch(coll.type) {
    case collection_types.table: 
      newColl.items = coll.el.querySelectorAll('.notion-collection-item > div:first-of-type')
      break
    case collection_types.board:
    case collection_types.calendar:
    case collection_types.list:
    case collection_types.gallery:
    default:
      newColl.items = coll.el.querySelectorAll('.notion-collection-item')
      break
  }

  newColl.items = Array.from(newColl.items).map(item => {
    let link = item.querySelector('a')
    return { item, link }
  })

  return newColl
})

collection_list.forEach(coll => {
  coll.items.forEach(item => {
    item.item.classList.add('powerup-applied')
    item.item.onclick = e => {
      e.stopPropagation()
      window.location.href = item.link.href
    }
  })
})



let observer = new MutationObserver(function(mutations) {
  let el = document.querySelector('.notion-collection-item')
  let icons = el.querySelectorAll('svg.openAsPageThick')
  if (icons[0]) {
    console.log(icons[0].parentElement.parentElement)

  }
})

observer.observe(document.querySelector('.notion-collection-item'), { attributes: false, childList: true, subtree: true })
