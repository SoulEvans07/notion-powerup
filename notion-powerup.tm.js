// ==UserScript==
// @name         Notion Powerup
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @author       You
// @match        https://www.notion.so/*
// @grant        none
// ==/UserScript==

let log_state = true
function log() {
    if (log_state) {
        console.log('[notion-color]', ...arguments)
    }
}

function color () {
    const headerTypes = Array.from(document.querySelectorAll('.notion-table-view .notion-table-view-header-cell svg'))
        .map(s => s.classList[0])
    const mask = headerTypes.map(h => h === 'typesText')
    const rows = document.querySelectorAll('.notion-table-view .notion-collection-item')

    const updateCells = []
    rows.forEach(row => {
        const cells = Array.from(row.childNodes).filter((cell,i) => {
            const content = cell.querySelector('span > span')
            return mask[i]
        })
        updateCells.push(...cells)
    })

    updateCells.forEach(cell => {
        const content = cell.querySelector('span > span')
        if (content && content.innerText) {
            cell.style.background = content.style.background
        } else {
            cell.style.background = ''
        }
    })
}

const hideBtnChevron = (isDark) => `
<svg viewBox="0 0 30 30" class="chevronDown"
  style="width: 10px; height: 100%; display: block; fill: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgb(55, 53, 47)'}; flex-shrink: 0; backface-visibility: hidden;"
>
  <polygon points="15,17.4 4.8,7 2,9.8 15,23 28,9.8 25.2,7 "></polygon>
</svg>
`

const propsContainerId = 'notion-properties-dropdown'
const propsId = 'notion-page-props'
const titleId = 'notion-page-title'
const hideBtnId = 'hide-page-props'
const storeId = 'notion-powertool-store'

function setPropsVisibility(isHidden, targets) {
    targets.forEach(target => {
        if (!target) return

        const properties = target.querySelector(`#${propsId}`)
        const discussion = target.querySelector('.notion-page-view-discussion')
        if (!properties || !discussion) return

        const hideSvg = target.querySelector(`#${hideBtnId} svg`)
        if (isHidden) {
            properties.style.display = 'none'
            discussion.style.display = 'none'
            hideSvg.style.transform = ''
        } else {
            properties.style.display = ''
            discussion.style.display = ''
            hideSvg.style.transform = 'rotateZ(180deg)'
        }
    })
}

function pageProperties(isDark, target, isModal, other) {
    if (!target || target.childNodes.length < 5) return

    if (!target.childNodes[0].id) target.childNodes[0].id = titleId
    if (!target.childNodes[1].id) target.childNodes[1].id = propsId

    let container = target.querySelector(`#${propsContainerId}`)
    const properties = target.querySelector(`#${propsId}`)
    const discussion = target.querySelector('.notion-page-view-discussion')

    if (container === null && properties) {
        container = document.createElement('div')
        container.style.width = '100%'
        container.id = propsContainerId
        target.insertBefore(container, properties)
    }

    if (properties && !container.contains(properties)) {
        container.appendChild(properties)
        container.appendChild(discussion)
        let store = JSON.parse(window.localStorage.getItem(storeId)) || { isPropsHidden: false }

        const hideBtn = document.createElement('div')
        hideBtn.id = hideBtnId
        hideBtn.innerHTML = hideBtnChevron(isDark)
        const hideSvg = hideBtn.querySelector('svg')

        hideBtn.style.display = 'flex'
        hideBtn.style.width = `calc(${properties.childNodes[0].style.width} - 2 * ${properties.childNodes[0].style.paddingLeft})`
        hideBtn.style.padding = `0 `
        hideBtn.style.maxWidth = '100%'
        hideBtn.style.border = isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid rgba(55, 53, 47, 0.05)'
        hideBtn.style.cursor = 'pointer'
        hideBtn.style.justifyContent = 'center'
        hideBtn.style.margin = isModal ? '4px 126px' : '4px auto'
        hideBtn.style.height = '30px'
        hideBtn.style.borderRadius = '3px'
        hideSvg.style.transform = 'rotateZ(180deg)'

        hideBtn.onmouseenter = () => { hideBtn.style.backgroundColor = isDark ? 'rgba(71, 76, 80)' : 'rgba(55, 53, 47, 0.08)'}
        hideBtn.onmouseleave = () => { hideBtn.style.backgroundColor = 'transparent'}

        hideBtn.onclick = e => {
            e.stopPropagation()

            store = { ...store, isPropsHidden: !store.isPropsHidden }
            window.localStorage.setItem(storeId, JSON.stringify(store))

            setPropsVisibility(store.isPropsHidden, [target, other])
        }

        container.appendChild(hideBtn)
        setPropsVisibility(store.isPropsHidden, [target, other])
    }
}

const jumper = function(el, jumps) {
    const path = [ el ]
    let next = el
    let exit = null

    jumps.some((jump, i) => {
        exit = next

        if (jump >= 0) {
            if (next.childNodes[jump] == null) return true
            next = next.childNodes[jump]
        } else {
            next = next.parentElement
        }
        path.push(next)
    })

    // debug:
    return { el: path[path.length-1], lastIndex: path.length-1, path }
    //return path[path.length-1]
}

const collection_types = {
    table: 'table',
    board: 'board',
    calendar: 'calendar',
    list: 'list',
    gallery: 'gallery'
}
let collection_selector = '.notion-' + Object.values(collection_types).join('-view, .notion-') + '-view'

const openAsPageSelector = 'open-as-page'
const titleSelector = 'open-page-title'
const endSymbol = '  '
const hoverSymbol = ' ⤢'
function openAsPage(isDark) {
    let collection_list = Array.from(document.querySelectorAll(collection_selector))
    .map(coll => {
        const isInModal = coll.parentElement.parentElement.classList.contains('notion-collection_view-block')
        const type = coll.className.split('notion-')[1].split('-view')[0]
        return { el: coll, type, isInModal }
    })
    .map(coll => {
        const newColl = { ...coll }

        let headerContainer = jumper(coll.el, [-1, -1, 0, 0]).el
        //newColl.title = jumper(headerContainer, [headerContainer.childElementCount - 1, 0, 0, 0, 0]).el
        //if (!newColl.title.nodeValue) console.error(newColl.title)

        newColl.title = headerContainer.querySelector('[placeholder="Untitled"]')
        if (newColl.title.childNodes.length > 0) newColl.title = newColl.title.childNodes[0]
        if (newColl.title.childNodes.length > 0) newColl.title = newColl.title.childNodes[0]

        if (!newColl.title.nodeValue) console.log(newColl)
        newColl.openAsNewPage = newColl.title.nodeValue.endsWith(endSymbol)

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
            const link = item.querySelector('a')
            let title = null
            let targets = []
            switch(coll.type) {
                case collection_types.table:
                    // title = jumper(item, [0, 0, 0]).el
                    title = item.querySelector('span')
                    title = title.childNodes.length > 0 ? title.childNodes[0] : title
                    targets.push(link)
                    break
                case collection_types.board:
                    title = item.querySelector('[placeholder="Untitled"]')
                    title = title.childNodes.length > 0 ? title.childNodes[0] : title
                    targets.push(jumper(item, [0, 0, 1]).el)
                    break
                case collection_types.calendar:
                    title = jumper(item, [0, 0, 0, 0, 0, 0]).el
                    targets.push(jumper(item, [0, 0]).el)
                    break
                case collection_types.list:
                    title = jumper(item, [0, 0, 1, 0, 0]).el
                    targets.push(jumper(item, [0, 0]).el)
                    break
                case collection_types.gallery:
                    title = item.querySelector('[placeholder="Untitled"]') // jumper(item, [0, 0, 1, 0, 0]).el
                    title = title.childNodes.length > 0 ? title.childNodes[0] : title
                    targets.push(jumper(item, [0, 0, 0, 0]).el)
                    targets.push(jumper(item, [0, 0, 1]).el)
                    break
            }

            return { item, targets, title, openAsNewPage: !!title.nodeValue && title.nodeValue.endsWith(endSymbol), link }
        })

        return newColl
    })

    collection_list.forEach(coll => {
        coll.items.forEach(item => {
            item.targets.forEach(target => {
                if (!target) return

                if (item.openAsNewPage || coll.openAsNewPage) {
                    if (target.classList.contains(openAsPageSelector)) return
                    if (!item.link) return

                    target.classList.add(openAsPageSelector)
                    target.onclick = e => {
                        e.stopPropagation()
                        window.location.href = item.link.href
                    }

                    if (coll.type === collection_types.table && !item.title.nodeValue.endsWith(hoverSymbol)) item.title.nodeValue += hoverSymbol

                    item.item.onmouseenter = () => { if (!item.title.nodeValue.endsWith(hoverSymbol)) item.title.nodeValue += hoverSymbol}
                    item.item.onmouseleave = () => { item.title.nodeValue = item.title.nodeValue.split(hoverSymbol)[0] }
                } else {
                    target.classList.remove(openAsPageSelector)
                    target.onclick = null
                    item.title.parentElement.style.textShadow = ''

                    item.item.onmouseenter = null
                    item.item.onmouseover = null
                }
            })
        })
    })

    window.collections = collection_list
}

const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutationRecord) {
        const isDark = !!document.querySelector('.notion-app-inner.notion-dark-theme')
        const page = document.querySelector('.notion-frame .notion-scroller')
        const modal = document.querySelector('.notion-peek-renderer .notion-scroller')

        color()

        pageProperties(isDark, page, false, modal)
        pageProperties(isDark, modal, true, page)

        openAsPage(isDark)
    })
})

function main() {
    'use strict'
    const app = document.getElementById("notion-app")
    observer.observe(app, { attributes: false, childList: true, subtree: true })
}

main()