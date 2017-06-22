import _ from "lodash";

function query(selector) {
  return document.querySelectorAll(selector);
}

function realPoint(pnt, offset, scale) {
  return Math.round(pnt * scale * window.devicePixelRatio);
}

function checkStyle(el) {
  var valid = true;
  _.forEach({
    "display": ["none"], 
    "visibility": ["hidden"]
  }, (values, key) => {
    values.forEach((value) => {
      valid = el.style[key] != value;
      return valid;
    });
    return valid;
  });
  return valid;
}

export function translateElements(elements) {
  const cnt = query("#mobage-game-container")[0];
  if (!cnt) {
    return null;
  }
  const windowRect = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  const offset = cnt.parentNode.getBoundingClientRect();
  const scale = Number(cnt.style.zoom);

  var footerHeight = 0;
  const footer = query(".cnt-pc-global-footer")[0];
  if (footer) {
    footerHeight = footer.getBoundingClientRect().height * scale;
  }

  const result = {
    scale, 
    window: windowRect,
    rects: []
  };
  elements.forEach((el) => {
    if (!checkStyle(el)) {
      return;
    }
    const temp = el.getBoundingClientRect();
    const real = {
      x: realPoint(temp.left, offset.left, scale),
      y: realPoint(temp.top, offset.top, scale),
      width: realPoint(temp.width, 0, scale),
      height: realPoint(temp.height, 0, scale)
    };
    if (real.width <= 0 || real.height <= 0) {
      return;
    } else if (real.x > windowRect.width || real.x < 0) {
      return;
    } else if (real.y > windowRect.height - footerHeight || real.y < 0) {
      const before = cnt.parentNode.scrollTop;
      cnt.parentNode.scrollTop += real.y;
      const after = cnt.parentNode.scrollTop;
      real.y -= after - before;
    }
    result.rects.push(real);
  });
  return result;
}

export function translateElement(el) {
  var result = translateElements([el]);
  if (!result) {
    return null;
  }

  result = _.assign(result, result.rects[0]);
  delete result.rects;
  return result;
}

export default {
  "elements": function(payload, done, fail, retry) {
    var selector = payload;
    var retryOnNull = false;
    if (_.isArray(payload)) {
      selector = payload.join(",");
    } else if (_.isObject(payload)) {
      selector = payload.selector;
      retryOnNull = payload.retry;
    }

    const cb = (result) => {
      result.selector = selector;
      done(result);
    };

    function findElements() {
      const result = translateElements(query(selector));
      if (!result) {
        return retry(findElements, 150);
      }

      if (!result.rects.length) {
        if (retryOnNull) {
          retry(findElements);
        } else {
          fail(selector);
        }
      } else {
        cb(result);
      }
    }
    findElements();
  },
  "element": function(payload, done, fail, retry) {
    this.elements(payload, (payload) => {
      payload = _.assign(payload, payload.rects[0]);
      delete payload.rects;
      done(payload);
    }, fail, retry);
  }
};
