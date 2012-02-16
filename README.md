# Crop5.js

## Version

0.0.1

## Intro

Client side image cropping using HTML5 canvas and File API.

Only final cropped result been send to server.

No limitation on initial image size, as long as client machine can handle.

Benefits two sides:

* User able to crop from bigger image, no waiting for initial image upload.
* Sever saves bandwidth and computation power.

## Usage

1. Include crop5.js to page.
2. Add this line of js:

```
$.('#canvas_element_id').crop5();
```

3. Do cropping
4. Get data

```
$.('#canvas_element_id').crop5('get');
```

Return
## Options

* fileSelector: The file input for choosing image file. If empty then a new file input would be created.

```
$.('#canvas_element_id').crop5({fileSelector: '#uploadForm input[name=imagePicker]'});
```

* imageType: Output image type. Default 'image/jpeg'.

```
$.('#canvas_element_id').crop5({imageType: 'image/png'});
```
