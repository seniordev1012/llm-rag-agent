const hljsCss = `
pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}/*!
  Theme: GitHub Dark Dimmed
  Description: Dark dimmed theme as seen on github.com
  Author: github.com
  Maintainer: @Hirse
  Updated: 2021-05-15

  Colors taken from GitHub's CSS
*/.hljs{color:#adbac7;background:#22272e}.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#f47067}.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#dcbdfb}.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#6cb6ff}.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#96d0ff}.hljs-built_in,.hljs-symbol{color:#f69d50}.hljs-code,.hljs-comment,.hljs-formula{color:#768390}.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#8ddb8c}.hljs-subst{color:#adbac7}.hljs-section{color:#316dca;font-weight:700}.hljs-bullet{color:#eac55f}.hljs-emphasis{color:#adbac7;font-style:italic}.hljs-strong{color:#adbac7;font-weight:700}.hljs-addition{color:#b4f1b4;background-color:#1b4721}.hljs-deletion{color:#ffd8d3;background-color:#78191b}
`;

const customCss = `
/**
 * ==============================================
 * Dot Falling
 * ==============================================
 */
.dot-falling {
  position: relative;
  left: -9999px;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #eeeeee;
  color: #5fa4fa;
  box-shadow: 9999px 0 0 0 #eeeeee;
  animation: dot-falling 1.5s infinite linear;
  animation-delay: 0.1s;
}

.dot-falling::before,
.dot-falling::after {
  content: "";
  display: inline-block;
  position: absolute;
  top: 0;
}

.dot-falling::before {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #eeeeee;
  color: #eeeeee;
  animation: dot-falling-before 1.5s infinite linear;
  animation-delay: 0s;
}

.dot-falling::after {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #eeeeee;
  color: #eeeeee;
  animation: dot-falling-after 1.5s infinite linear;
  animation-delay: 0.2s;
}

@keyframes dot-falling {
  0% {
    box-shadow: 9999px -15px 0 0 rgba(152, 128, 255, 0);
  }

  25%,
  50%,
  75% {
    box-shadow: 9999px 0 0 0 #eeeeee;
  }

  100% {
    box-shadow: 9999px 15px 0 0 rgba(152, 128, 255, 0);
  }
}

@keyframes dot-falling-before {
  0% {
    box-shadow: 9984px -15px 0 0 rgba(152, 128, 255, 0);
  }

  25%,
  50%,
  75% {
    box-shadow: 9984px 0 0 0 #eeeeee;
  }

  100% {
    box-shadow: 9984px 15px 0 0 rgba(152, 128, 255, 0);
  }
}

@keyframes dot-falling-after {
  0% {
    box-shadow: 10014px -15px 0 0 rgba(152, 128, 255, 0);
  }

  25%,
  50%,
  75% {
    box-shadow: 10014px 0 0 0 #eeeeee;
  }

  100% {
    box-shadow: 10014px 15px 0 0 rgba(152, 128, 255, 0);
  }
}

#chat-history::-webkit-scrollbar,
#chat-container::-webkit-scrollbar,
.no-scroll::-webkit-scrollbar {
  display: none !important;
}

/* Hide scrollbar for IE, Edge and Firefox */
#chat-history,
#chat-container,
.no-scroll {
  -ms-overflow-style: none !important;
  /* IE and Edge */
  scrollbar-width: none !important;
  /* Firefox */
}


.animate-slow-pulse {
  transform: scale(1);
  animation: subtlePulse 20s infinite;
  will-change: transform;
}

@keyframes subtlePulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes subtleShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.bg-black-900 {
  background: #141414;
}
`;

export default function Head() {
  return (
    <head>
      <style>{hljsCss}</style>
      <style>{customCss}</style>
    </head>
  );
}
