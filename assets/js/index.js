const fileInput = document.getElementById('file-input');
const fileBoard = document.getElementById('file-board');
const fileFrame = document.getElementById('boader-frame');
const compareButton = document.getElementById('compare-button');
const resultSpan = document.getElementById('result-percent');
const compareImagesRGB = [];

const dataURItoBlob = dataURI => {
  const bytes =
    dataURI.split(",")[0].indexOf("base64") >= 0
      ? atob(dataURI.split(",")[1])
      : unescape(dataURI.split(",")[1]);
  const mime = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const max = bytes.length;
  const ia = new Uint8Array(max);
  for (let i = 0; i < max; i++) ia[i] = bytes.charCodeAt(i);
  return new Blob([ia], { type: mime });
};

const getResize = (image, maxSize) => {
  let width = image.width;
  let height = image.height;

  if (width > height) {
    if (width > maxSize) {
      height *= maxSize / width;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width *= maxSize / height;
      height = maxSize;
    }
  }

  return { width, height }
};

const displayViewImage = url => {
  const viewImage = new Image();
  const frame = document.createElement('div');

  viewImage.src = url;
  frame.classList.add('frame');
  frame.appendChild(viewImage);
  fileFrame.appendChild(frame);
};

const resizeImage = ({ canvas, file, maxSize }) => {
  const reader = new FileReader();
  const image = new Image();

  const getResizeBlobURI = canvas => {
    return dataURItoBlob(canvas.toDataURL("image/jpeg"));
  };

  return new Promise((resolve, reject) => {
    if (!file || !file.type.match(/image.*/)) {
      reject(new Error('파일이 없거나 이미지가 아닙니다.'));
      return;
    }

    reader.onload = ({ target }) => {
      image.onload = () => {
        const { width, height } = getResize(image, maxSize);
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);
        const blobURI = getResizeBlobURI(canvas);
   
        return resolve(
          { blobURI, image }
        );
      };

      image.src = target.result;
      displayViewImage(target.result);
    };
    reader.readAsDataURL(file);
  });
};

const grayscaleImage = (context, image) => {
  const { width, height } = image;
  context.drawImage(image, 0 , 0);

  // getImageData() 메소드는 imageData의 객체를 반환 복사 캔버스에 지정된 사각형의 픽셀 데이터.
  // imageData의 객체가 그림없고, 그 일부를 지정 (rectangle) 캔버스를 그 사각형 안에있는 모든 화소의 정보를 보유하고있다.
  const imgPixels = context.getImageData(0, 0, width, height);
  const rgb = 3;
  const rgba = 4;

  // imageData의 개체 화소마다 내용 RGBA 값의 네 가지가있다 :
  // R - 붉은 색 (from 0-255)
  // G - 색상 녹색 (from 0-255)
  // B - 색상 블루 (from 0-255)
  // A - 알파 채널 (from 0-255; 0 is transparent and 255 is fully visible)
  // 컬러 / 알파 정보는 배열로 유지되고, 저장되는 데이터 imageData의 객체의 속성.
  console.log('width,height', width,height)

  const pixelsAvg = [];

  // 좌표마다 반복하며 값 삽입
  for(var y = 0; y < height; y++) {
    for(var x = 0; x < width; x++) {
      var i = (y * rgba) * width + x * rgba;

      // R, G, B 값의 평균을 구하여 동일하게 배분
      var avg = (imgPixels.data[i] + imgPixels.data[i + 1] + imgPixels.data[i + 2]) / rgb;
      // 반환 된 imageData의 객체의 제 1 픽셀의 색상 / 알파 정보를 얻기위한 코드 :
      imgPixels.data[i] = avg; // red
      imgPixels.data[i + 1] = avg; // green
      imgPixels.data[i + 2] = avg; // blue
      // imgPixels.data[i + 3] // alpha
     
      // 비교하기 위해 평균 값 중 하나를 추출해 리스트에 넣는다.
      pixelsAvg.push(imgPixels.data[i]);
    }
  }

  // getImageData로 사본을 뜨고 이 사본을 쪼물딱거려 원하는대로 바꾼 후 다시 putImageData로 밀어 넣는 것
  context.putImageData(imgPixels, 0, 0, 0, 0, imgPixels.width, imgPixels.height);
 
  // 비교하기 위해 평균 값 중 하나를 추출해 리스트에 넣는다.
  compareImagesRGB.splice(compareImagesRGB.length, 0, pixelsAvg);
  console.log('compareImagesRGB',compareImagesRGB)
};

const handleOnChangeFileInput = ({ target }) => {
  const canvas = document.createElement("canvas");
  // getContext() 메서드를 이용해서, 랜더링 컨텍스트와 (렌더링 컨텍스트의) 그리기 함수들을 사용할 수 있습니다
  const context = canvas.getContext("2d"); // 2D 그래픽

  const payload = {
    canvas,
    file: target.files[0],
    // 크기가 커짐에 따라 흑백 전환, rgb 값으로 비교하는 등.. 시간 값 증가
    maxSize: 8,
  };

  resizeImage(payload)
    .then(({ blobURI, image }) => {
      const url = window.URL.createObjectURL(blobURI);
      image.src = url;
      image.onload = () => {
        grayscaleImage(context, image);
      };

      // const frame = document.createElement('div');
      // frame.classList.add('frame');
      // frame.appendChild(image);
      // fileFrame.appendChild(frame);
    })
    .catch(err => {
      console.log(err);
    });
};

const handleOnClickCompare = () => {
  const firstImage = compareImagesRGB[0];
  const second = compareImagesRGB[1];
  const firstImageLength = firstImage.length;
  const rule = 5;
  let percentCount = 0;

  for (let i = 0; i < firstImageLength; i++) {
    if (Math.abs(firstImage[i] - second[i]) <= rule) {
      percentCount++;
    }
  }

  const percent = percentCount / firstImageLength * 100;
  resultSpan.innerText = `${Math.round(percent)}%`;
};

fileInput.addEventListener("change", handleOnChangeFileInput);
compareButton.addEventListener('click', handleOnClickCompare);