export interface Slide {
  id: string
  html: string
  title: string
}

export interface HtmlDeck {
  name: string
  sourceHtml: string
  slides: Slide[]
  usesSections: boolean
}

const slideMarkerAttribute = 'data-hss-editor-slide'
const editingMarkerAttribute = 'data-hss-editor-text'

function getSlideSections(body: HTMLElement): HTMLElement[] {
  return Array.from(body.querySelectorAll<HTMLElement>('section')).filter(
    (section) => !section.parentElement?.closest('section'),
  )
}

export function getSlideTitle(html: string, fallback: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('script,style,noscript,template').forEach((element) => element.remove())
  const heading = template.content.querySelector('h1,h2,h3,h4,h5,h6')
  const headingText = heading?.textContent?.replace(/\s+/g, ' ').trim()
  if (headingText) return headingText

  const firstText = template.content.textContent?.replace(/\s+/g, ' ').trim()
  if (!firstText) return fallback
  return firstText.length > 48 ? `${firstText.slice(0, 45)}…` : firstText
}

export function parseHtmlDeck(sourceHtml: string, name: string): HtmlDeck {
  if (!sourceHtml.trim()) throw new Error('The selected HTML file is empty.')

  const document = new DOMParser().parseFromString(sourceHtml, 'text/html')
  const sections = getSlideSections(document.body)
  const slideMarkup = sections.length
    ? sections.map((section) => section.outerHTML)
    : [document.body.innerHTML]
  const usesSections = sections.length > 0

  return {
    name,
    sourceHtml,
    usesSections,
    slides: slideMarkup.map((html, index) => ({
      id: `slide-${index + 1}`,
      html,
      title: getSlideTitle(html, `Slide ${index + 1}`),
    })),
  }
}

function getDocumentType(document: Document): string {
  const doctype = document.doctype
  if (!doctype) return ''
  if (doctype.publicId) {
    const systemId = doctype.systemId ? ` "${doctype.systemId}"` : ''
    return `<!DOCTYPE ${doctype.name} PUBLIC "${doctype.publicId}"${systemId}>`
  }
  if (doctype.systemId) {
    return `<!DOCTYPE ${doctype.name} SYSTEM "${doctype.systemId}">`
  }
  return `<!DOCTYPE ${doctype.name}>`
}

export function exportHtmlDeck(deck: HtmlDeck): string {
  const document = new DOMParser().parseFromString(deck.sourceHtml, 'text/html')

  if (deck.usesSections) {
    const sections = getSlideSections(document.body)
    if (sections.length !== deck.slides.length) {
      throw new Error('The source document no longer matches the slide list.')
    }

    sections.forEach((section, index) => {
      const template = document.createElement('template')
      template.innerHTML = deck.slides[index].html
      const replacement = template.content.firstElementChild
      if (!replacement || replacement.tagName !== 'SECTION') {
        throw new Error(`Slide ${index + 1} must remain a <section> element.`)
      }
      section.replaceWith(replacement)
    })
  } else {
    if (deck.slides.length !== 1) {
      throw new Error('A document without slide sections must contain one slide.')
    }
    document.body.innerHTML = deck.slides[0].html
  }

  const doctype = getDocumentType(document)
  return `${doctype ? `${doctype}\n` : ''}${document.documentElement.outerHTML}`
}

export function cleanSlideMarkup(html: string, token: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const root = template.content.firstElementChild
  if (root?.getAttribute(slideMarkerAttribute) === token) {
    root.removeAttribute(slideMarkerAttribute)
  }
  if (root?.getAttribute(editingMarkerAttribute) === token) {
    root.removeAttribute(editingMarkerAttribute)
    root.removeAttribute('contenteditable')
  }
  template.content
    .querySelectorAll(`[${slideMarkerAttribute}="${token}"],[${editingMarkerAttribute}="${token}"]`)
    .forEach((element) => {
      element.removeAttribute(slideMarkerAttribute)
      element.removeAttribute(editingMarkerAttribute)
      element.removeAttribute('contenteditable')
    })
  return template.innerHTML
}

export function buildSlidePreview(
  deck: HtmlDeck,
  slideIndex: number,
  token: string,
): string {
  const document = new DOMParser().parseFromString(deck.sourceHtml, 'text/html')
  const slide = deck.slides[slideIndex]
  if (!slide) throw new Error('The selected slide does not exist.')

  let slideElement: HTMLElement
  if (deck.usesSections) {
    const sections = getSlideSections(document.body)
    if (sections.length !== deck.slides.length) {
      throw new Error('The source document no longer matches the slide list.')
    }
    const template = document.createElement('template')
    template.innerHTML = deck.slides[slideIndex].html
    const replacement = template.content.firstElementChild
    if (!replacement || replacement.tagName !== 'SECTION') {
      throw new Error(`Slide ${slideIndex + 1} must remain a <section> element.`)
    }
    sections[slideIndex].replaceWith(replacement)
    const currentSections = getSlideSections(document.body)
    slideElement = currentSections[slideIndex]
    currentSections.forEach((section, index) => {
      section.style.setProperty('display', index === slideIndex ? 'flex' : 'none', 'important')
    })
    slideElement.setAttribute(slideMarkerAttribute, token)
  } else {
    slideElement = document.body
    slideElement.innerHTML = deck.slides[slideIndex].html
    slideElement.setAttribute(slideMarkerAttribute, token)
  }

  const markerSelector = `[${slideMarkerAttribute}="${token}"]`
  const script = document.createElement('script')
  script.textContent = `
    (() => {
      const token = ${JSON.stringify(token)};
      const slideIndex = ${slideIndex};
      const slideCount = ${deck.slides.length};
      const markerSelector = ${JSON.stringify(markerSelector)};
      const excludedSelector = '.notes,.track,.pageno,.nav,script,style,noscript,svg,button,a,input,textarea,select';
      const post = (message) => parent.postMessage({ ...message, token, slideIndex }, '*');
      const syncCounters = () => {
        document.querySelectorAll('.cnt, #cnt, .pageno').forEach((counter) => {
          counter.textContent = (slideIndex + 1) + ' / ' + slideCount;
        });
      };
      const isTextEditing = (target) => target instanceof Element &&
        !!target.closest('input,textarea,select,[contenteditable="true"]');
      const directTextElements = (slide) => {
        const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
        const candidates = new Set();
        let node;
        while ((node = walker.nextNode())) {
          if (!node.nodeValue || !node.nodeValue.trim()) continue;
          const parent = node.parentElement;
          if (!parent || parent.closest(excludedSelector)) continue;
          candidates.add(parent);
        }
        return Array.from(candidates).filter((element) => {
          for (let ancestor = element.parentElement; ancestor && ancestor !== slide; ancestor = ancestor.parentElement) {
            if (candidates.has(ancestor)) return false;
          }
          return true;
        });
      };
      const markSlideTextEditable = () => {
        const slide = document.querySelector(markerSelector);
        if (!slide) return;
        directTextElements(slide).forEach((element) => {
          element.setAttribute('contenteditable', 'true');
          element.setAttribute(${JSON.stringify(editingMarkerAttribute)}, token);
        });
      };
      const sendSlideUpdate = () => {
        const slide = document.querySelector(markerSelector);
        if (!slide) return;
        const clone = slide.cloneNode(true);
        clone.removeAttribute(${JSON.stringify(slideMarkerAttribute)});
        clone.querySelector(${JSON.stringify(`[data-hss-editor-runtime="${token}"]`)})?.remove();
        clone.querySelectorAll(${JSON.stringify(`[${editingMarkerAttribute}="${token}"]`)}).forEach((element) => {
          element.removeAttribute('contenteditable');
          element.removeAttribute(${JSON.stringify(editingMarkerAttribute)});
        });
        post({
          type: 'slide-update',
          html: ${deck.usesSections ? 'clone.outerHTML' : 'clone.innerHTML'},
        });
      };
      const initializeEditor = () => {
        syncCounters();
        markSlideTextEditable();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEditor, { once: true });
      } else {
        initializeEditor();
      }

      document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('#prev, #next') : null;
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        syncCounters();
        post({ type: 'navigate', delta: target.id === 'prev' ? -1 : 1 });
      }, true);

      document.addEventListener('keydown', (event) => {
        if (isTextEditing(event.target)) {
          event.stopImmediatePropagation();
          return;
        }
        const target = event.target;
        if (target instanceof Element && target.closest('button,a,[role="button"]') &&
            (event.key === 'Enter' || event.key === ' ')) return;

        let delta = 0;
        if (event.key === 'ArrowRight' || event.key === 'PageDown' ||
            event.key === ' ' || event.key === 'Enter') delta = 1;
        else if (event.key === 'ArrowLeft' || event.key === 'PageUp') delta = -1;
        if (!delta) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        syncCounters();
        post({ type: 'navigate', delta });
      }, true);

      document.addEventListener('click', (event) => {
        const slide = document.querySelector(markerSelector);
        const clicked = event.target instanceof Element ? event.target : null;
        const target = clicked?.closest('[contenteditable="true"]') ||
          (clicked && slide?.contains(clicked)
            ? directTextElements(slide).find((element) => element.contains(clicked))
            : null);
        if (!slide || !target || !slide.contains(target)) return;
        target.setAttribute('contenteditable', 'true');
        target.setAttribute(${JSON.stringify(editingMarkerAttribute)}, token);
        target.focus();
        post({ type: 'selection', tag: target.tagName.toLowerCase(), text: target.textContent || '' });
      }, true);

      document.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.getAttribute('contenteditable') !== 'true') return;
        post({ type: 'selection', tag: target.tagName.toLowerCase(), text: target.textContent || '' });
        sendSlideUpdate();
      }, true);

      document.addEventListener('blur', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.getAttribute('contenteditable') !== 'true') return;
        sendSlideUpdate();
      }, true);
    })();
  `
  script.setAttribute('data-hss-editor-runtime', token)
  document.head.insertBefore(script, document.head.firstChild)
  return `${getDocumentType(document)}${getDocumentType(document) ? '\n' : ''}${document.documentElement.outerHTML}`
}
