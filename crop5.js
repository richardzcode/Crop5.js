(function($) {
  var optionsStore = {};

  // Util functions
  var error = function(err) {
    console.log(err);
    return false;
  };

  var inCrop = function(pos, crop) {
    return (pos.x >= crop.x) && (pos.x <= crop.x + crop.w)
           && (pos.y >= crop.y) && (pos.y <= crop.y + crop.h);
  };

  var fitRect = function(src, dest) {
    var ret = {x: 0, y: 0, w: dest.w, h: dest.h, scale: 1};
    if (src.w > dest.w || src.h > dest.h) {
      if (src.w / src.h > dest.w / dest.h) { // w rules
        ret.h = ret.w * src.h / src.w;
        ret.scale = dest.w / src.w;
      } else {
        ret.w = ret.h * src.w / src.h;
        ret.scale = dest.h / src.h;
      }
    } else {
      ret.w = src.w;
      ret.h = src.h;
    }

    if (ret.w < dest.w) {
      ret.x = (dest.w - ret.w) / 2;
    }
    if (ret.h < dest.h) {
      ret.y = (dest.h - ret.h) / 2;
    }

    return ret;
  };

  var scaleRect = function(rect, scale) {
    return {
      x: rect.x * scale
    , y: rect.y * scale
    , w: rect.w * scale
    , h: rect.h * scale
    };
  };

  var restrictRect = function(rect, canvas, sizeable) {
    if (sizeable && (rect.w > canvas.width || rect.h > canvas.height)) {
      console.log('Invalid rect');
      return null;
    }

    if (rect.x < 0) { rect.x = 0; }
    if (rect.w > canvas.width - rect.x) {
      if (sizeable) {
        rect.w = canvas.width - rect.x;
      } else {
        rect.x = canvas.width - rect.w;
      }
    }
    if (rect.y < 0) { rect.y = 0; }
    if (rect.h > canvas.height - rect.y) {
      if (sizeable) {
        rect.h = canvas.height - rect.y;
      } else {
        rect.y = canvas.height - rect.h;
      }
    }
    return rect;
  };

  // Crop functions
  var prepare = function(el, options) {
    if (el.size() == 0) {
      error('No canvas element selected.');
      return;
    }

    options = options || {};

    options.id = Date.now();
    options.canvas = el.get()[0];
    options.imageType = options.imageType || 'image/jpeg';

    // Canvas selector as key to lookup options.
    optionsStore[options.id] = options;
    el.mousedown(function(evt) {
        var that = $(this)
          , pos = {x: evt.offsetX, y: evt.offsetY};

        if (inCrop(pos, that.data('crop5-crop'))) {
          $(this).data('crop5-mousedown', {x: evt.offsetX, y: evt.offsetY});
        }
      })
      .mouseup(function(evt) {
        $(this).data('crop5-mousedown', null);
      })
      .mousemove(function(evt) {
        var that = $(this)
          , pos = that.data('crop5-mousedown')
          , crop = that.data('crop5-crop');

        if (inCrop({x: evt.offsetX, y: evt.offsetY}, crop)) {
          that.css('cursor', 'pointer');
        } else {
          that.css('cursor', 'auto');
        }
        if (!pos) {
          return;
        }

        draw(this, {x: evt.offsetX - pos.x, y: evt.offsetY - pos.y});
        $(this).data('crop5-mousedown', {x: evt.offsetX, y: evt.offsetY});
      });

    // Crop area
    var w = el.width()
      , h = el.height();
    if (!options.crop) {
      options.crop = {
        x: w / 4
      , y: h / 4
      , w: w / 2
      , h: h / 2
      };
    }
    el.data('crop5-crop', options.crop);

    // Bind file input
    if (!options.fileSelector) {
      var id = 'crop5_' + Date.now();
      options.fileSelector = '#' + id;
      $('<form enctype="multipart/form-data"></form>')
        .append('<input type="file" id="' + id + '"/>')
        .insertAfter(el);
    }
    $(options.fileSelector)
      .data('crop5-options-id', options.id)
      .bind('change', onSelectFile);

    el.data('crop5-options-id', options.id);
  };

  var onSelectFile = function(evt) {
    var options = optionsStore[$(this).data('crop5-options-id')]
      , reader = new FileReader()
      , img = new Image();

    options.img = img;
    img.onload = function(evt) {
      var el = $(options.canvas);
      el.data('crop5-image-data-clear', null);
      el.data('crop5-image-data-blur', null);
      
      $.each(el.get(), function(index, canvas) {
        var fit = fitRect({w: img.width, h: img.height}, {w: canvas.width, h: canvas.height});
        $(canvas).data('crop5-crop', scaleRect(options.crop, fit.scale));
        draw(canvas);
      });
    };

    reader.onload = function(evt) {
      img.src = evt.target.result;
    };

    reader.readAsDataURL(this.files[0]);
  };

  var drawPrepare = function(img, ctx, el) {
    var canvas = ctx.canvas;
    var fit = fitRect(
          {w: img.width, h: img.height}
        , {w: canvas.width, h: canvas.height}
        );

    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, fit.x, fit.y, fit.w, fit.h);
    el.data('crop5-image-data-clear', ctx.getImageData(0, 0, canvas.width, canvas.height));

    ctx.globalAlpha = 0.5;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, fit.x, fit.y, fit.w, fit.h);
    el.data('crop5-image-data-blur', ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  var draw = function(canvas, offset) {
    var el = $(canvas)
      , crop = el.data('crop5-crop')
      , options = optionsStore[el.data('crop5-options-id')]
      , img = (options && options.img)? options.img : null;

    if (!options.img) {
      return;
    }

    // Offset
    if (offset && ((crop.x == 0 && offset.x < 0)
                  || (crop.x + crop.w == canvas.width && offset.x > 0)
                  || (crop.y == 0 && offset.y < 0)
                  || (crop.y + crop.h == canvas.height && offset.y > 0))
       ) {
      return;
    }
    if (offset) {
      crop.x += offset.x;
      crop.y += offset.y;
    }
    restrictRect(crop, canvas, false);

    var ctx = canvas.getContext('2d');

    // Prepare image data
    var img_data_clear = el.data('crop5-image-data-clear');
    var img_data_blur = el.data('crop5-image-data-blur');
    if (!img_data_clear) {
      drawPrepare(img, ctx, el);

      img_data_clear = el.data('crop5-image-data-clear');
      img_data_blur = el.data('crop5-image-data-blur');
    }

    // Draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(img_data_blur, 0, 0);

    // Draw crop
    ctx.save();
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.clip();
    ctx.putImageData(img_data_clear, 0, 0, crop.x, crop.y, crop.w, crop.h);
    ctx.restore();

    // Draw border
    ctx.save();
    ctx.globalCompositeOperation = 'xor';
    ctx.beginPath();
    ctx.rect(crop.x, crop.y, crop.w, crop.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#888888';
    ctx.stroke();
    ctx.restore();
  };

  var getCroppedImageData = function(canvas) {
    var el = $(canvas)
      , crop = el.data('crop5-crop')
      , options = optionsStore[el.data('crop5-options-id')];

    var temp_can = $('<canvas width="' + crop.w + '" height="' + crop.h + '"></canvas>').hide().get()[0];
    temp_can.getContext('2d').putImageData(
      canvas.getContext('2d').getImageData(crop.x, crop.y, crop.w, crop.h)
    , 0, 0
    );
    return temp_can.toDataURL(options.imageType);
  };

  $.fn['crop5'] = function(options) {
    var args = arguments;
    if (args.length > 0 && typeof args[0] != 'string') {
      prepare($(this), (args.length > 0)? args[0] : null);
    } else {
      switch(args[0]) {
        case 'get':
          return getCroppedImageData(this[0]);
      }
    }
  };
})(jQuery);
