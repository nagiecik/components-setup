import { ComponentNodeDef, ComponentSchemaDef } from '../types/generator';
import { buildFigmaNode, VariableEngine } from './engine';
import { dsRegistry } from '../audit/registry';
import { parseHexOrRgb } from '../utils/colors';
import { applyVariantMetrics, setupComponentSets } from '../components/setup';
import { sanitizeComponentProperties } from '../properties/sanitizer';
import { sanitizeLayerNames } from '../renamer/frameClassifier';

export const MAMF_LOGO_LIGHT_SVG = `<svg width="287" height="112" viewBox="0 0 287 112" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M84.8816 100.903C84.8681 100.767 84.8004 100.631 84.7192 100.508L72.8756 86.3528C75.7722 83.195 77.8973 81.0853 80.1442 75.8314C85.0576 64.3164 73.7689 59.9336 70.0872 58.8447C69.7895 58.7631 69.4646 58.7903 69.1939 58.9264C68.9232 59.0761 68.7066 59.3075 68.5983 59.6069C67.1365 63.6494 65.9859 66.5214 65.1061 68.25C64.294 69.9378 63.2788 71.4894 62.0606 72.905L48.781 57.0505L46.9549 54.8703C46.7654 54.6525 46.6301 54.3939 46.5489 54.1081C46.4541 53.8358 46.4406 53.5364 46.4676 53.2506C46.5083 52.9647 46.603 52.6789 46.7384 52.4339C46.8873 52.1889 47.0903 51.9711 47.3204 51.7942C47.4815 51.6768 47.6412 51.5594 47.7993 51.4418C52.0249 48.3014 55.182 45.0982 57.2826 41.8444C59.7596 38.0061 60.9913 33.7322 60.9913 29.0092C60.9913 22.68 58.5955 17.4397 53.7904 13.2611C48.9988 9.09611 42.8266 7 35.2737 7C27.7209 7 22.1713 9.16417 17.4744 13.4925C12.7776 17.8072 10.4359 23.2381 10.4359 29.7714C10.4359 33.2422 11.1398 36.6722 12.4527 39.8844C13.7928 43.26 15.8231 46.5947 18.5437 49.875C12.1279 53.7542 7.44457 57.9328 4.46674 62.3972C1.48892 66.8617 0 71.925 0 77.56C0 85.4 3.07258 91.9333 9.2042 97.16C15.3493 102.387 23.2135 105 32.8103 105C37.0198 105 41.2023 104.415 45.2359 103.258C49.3237 102.101 53.5468 100.318 57.9052 97.9222C59.0557 99.1336 60.4499 100.114 61.9794 100.767C63.5225 101.434 65.1738 101.774 66.8522 101.774H84.1236C84.2725 101.774 84.4214 101.733 84.5432 101.652C84.6651 101.57 84.7598 101.461 84.814 101.325C84.8816 101.203 84.9087 101.053 84.8816 100.903ZM30.5227 23.0339C32.1064 21.5775 34.1503 20.8561 36.6544 20.8561C38.9148 20.8561 40.7962 21.5775 42.2851 23.0339C43.7876 24.4767 44.5321 26.3006 44.5185 28.5056C44.5185 30.6561 43.6793 32.7522 42.0009 34.8211C40.3225 36.8764 37.9132 38.7683 34.7729 40.5106C32.6343 38.36 30.9965 36.2775 29.873 34.2494C28.736 32.235 28.1675 30.3567 28.1675 28.6281C28.1675 26.355 28.9526 24.4903 30.5227 23.0339ZM39.9164 86.9925C37.9267 87.5097 35.8828 87.7819 33.8254 87.7956C29.7241 87.7956 26.3808 86.7067 23.7956 84.5153C21.2103 82.3239 19.9244 79.4792 19.9244 75.9811C19.8973 73.2997 20.7365 70.6728 22.3472 68.5222C23.958 66.3308 26.3808 64.4797 29.6023 62.9553L47.0903 84.4608C44.7757 85.4817 42.3664 86.3256 39.9164 86.9925Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M47.3204 51.7942L29.6023 62.9553L33.3914 67.5697L48.9709 57.2933C48.9257 57.2381 48.8607 57.155 48.781 57.0505L46.9549 54.8703C46.7654 54.6525 46.6301 54.3939 46.5489 54.1081C46.4541 53.8358 46.4406 53.5364 46.4676 53.2506C46.5083 52.9647 46.603 52.6789 46.7384 52.4339C46.8873 52.1889 47.0903 51.9711 47.3204 51.7942ZM47.3204 51.7942L47.7993 51.4418C47.6412 51.5594 47.4815 51.6768 47.3204 51.7942Z" fill="black" fill-opacity="0.22"/><path d="M57.9052 97.9222C57.9052 97.9222 66.3379 92.9269 72.8756 86.3528L77.6661 92.0695C77.6661 92.0695 69.6125 98.7526 60.0834 99.7326C59.1224 99.1609 57.9052 97.9222 57.9052 97.9222Z" fill="black" fill-opacity="0.22"/><path fill-rule="evenodd" clip-rule="evenodd" d="M106.663 0V112H105.287V0H106.663Z" fill="white"/><path d="M144.916 45.701H142.736V36.351C142.736 34.0715 141.723 32.9318 139.698 32.9318C139.137 32.8867 138.574 32.9694 138.05 33.1735C137.526 33.3777 137.055 33.6979 136.673 34.1102C136.028 34.8829 135.706 36.0742 135.706 37.684V45.701H133.493V36.351C133.565 35.4303 133.299 34.5148 132.745 33.7753C132.447 33.477 132.087 33.2471 131.69 33.1014C131.294 32.9558 130.87 32.8979 130.449 32.9318C129.883 32.8825 129.314 32.9683 128.788 33.1822C128.262 33.3961 127.794 33.7318 127.424 34.1617C126.779 34.9795 126.476 36.3189 126.476 38.1669V45.701H124.283V31.3477H126.07L126.418 33.3117H126.521C126.955 32.6038 127.584 32.0359 128.333 31.6761C129.11 31.2752 129.974 31.0717 130.849 31.0837C133.106 31.0837 134.581 31.8929 135.274 33.5113H135.39C135.836 32.7527 136.489 32.1363 137.273 31.734C138.13 31.2928 139.083 31.0715 140.046 31.0901C141.71 31.0901 142.942 31.5194 143.742 32.378C144.542 33.2365 144.942 34.5652 144.942 36.3639L144.916 45.701Z" fill="white"/><path d="M155.52 45.9457C154.586 45.9948 153.653 45.8483 152.78 45.5156C151.907 45.1829 151.113 44.6714 150.45 44.0139C149.216 42.7261 148.601 40.9273 148.605 38.6178C148.605 36.3125 149.179 34.4773 150.321 33.125C150.874 32.4628 151.571 31.9348 152.359 31.5812C153.147 31.2276 154.005 31.0574 154.868 31.0837C155.685 31.04 156.502 31.1765 157.26 31.4837C158.018 31.7909 158.699 32.2611 159.254 32.861C160.349 34.1639 160.913 35.8305 160.834 37.5295V38.9075H150.908C150.848 40.3099 151.307 41.6853 152.198 42.7711C152.657 43.2235 153.207 43.5725 153.813 43.7947C154.418 44.0168 155.064 44.1069 155.707 44.059C157.263 44.05 158.8 43.7189 160.222 43.0867V45.0185C159.508 45.324 158.765 45.5528 158.003 45.701C157.186 45.8667 156.354 45.9487 155.52 45.9457ZM158.493 37.1367C158.568 36.0132 158.241 34.8996 157.571 33.9943C157.241 33.6247 156.832 33.3347 156.374 33.1462C155.916 32.9577 155.421 32.8756 154.926 32.9061C154.412 32.8842 153.898 32.973 153.421 33.1663C152.943 33.3596 152.513 33.6529 152.159 34.0265C151.396 34.8888 150.954 35.9872 150.908 37.1367H158.493Z" fill="white"/><path d="M163.737 40.7234C163.722 39.6514 164.04 38.601 164.646 37.7163C165.54 36.6091 166.662 35.7065 167.936 35.0697C167.377 34.4817 166.859 33.8556 166.388 33.1958C165.85 32.3675 165.551 31.4073 165.523 30.4205C165.493 29.8455 165.593 29.2712 165.817 28.7404C166.04 28.2096 166.381 27.7361 166.813 27.3553C167.817 26.5788 169.067 26.1901 170.335 26.2607C171.581 26.1791 172.812 26.5675 173.786 27.3489C174.198 27.7361 174.52 28.209 174.73 28.7341C174.939 29.2593 175.031 29.8239 174.998 30.3883C174.995 31.3225 174.679 32.2289 174.102 32.964C173.275 33.9448 172.268 34.758 171.135 35.3595L176.507 40.5109C177.494 39.2609 178.158 37.7883 178.442 36.2223H180.655C180.245 38.3087 179.318 40.2592 177.959 41.8954L181.899 45.701H178.881L176.436 43.3764C175.518 44.2227 174.451 44.8928 173.289 45.3533C172.135 45.7754 170.913 45.9827 169.683 45.9651C168.096 46.0606 166.53 45.5676 165.285 44.5806C164.759 44.0902 164.348 43.4905 164.081 42.8239C163.813 42.1574 163.696 41.4403 163.737 40.7234ZM169.742 43.9946C170.71 44.0278 171.676 43.8665 172.581 43.5203C173.486 43.174 174.312 42.65 175.011 41.9791L169.258 36.4348C168.517 36.8555 167.82 37.3472 167.174 37.903C166.797 38.2501 166.496 38.6724 166.291 39.1426C166.087 39.6129 165.984 40.1207 165.988 40.6333C165.963 41.1004 166.043 41.5672 166.224 41.9987C166.405 42.4303 166.682 42.8154 167.033 43.1253C167.8 43.7331 168.763 44.042 169.742 43.9946ZM172.147 28.6818C171.642 28.2356 170.983 28.0045 170.309 28.0379C169.625 28.0091 168.954 28.239 168.432 28.6818C168.194 28.874 168.002 29.1175 167.872 29.394C167.741 29.6706 167.675 29.973 167.678 30.2788C167.673 30.9058 167.833 31.523 168.142 32.0689C168.595 32.7999 169.143 33.467 169.774 34.0523C170.678 33.5917 171.496 32.9797 172.192 32.2428C172.619 31.7122 172.847 31.0495 172.837 30.369C172.851 30.0547 172.797 29.7411 172.678 29.4498C172.559 29.1586 172.378 28.8966 172.147 28.6818Z" fill="white"/><path d="M204.861 45.701H202.681V36.3511C202.681 34.0716 201.67 32.9318 199.65 32.9318C199.089 32.8858 198.525 32.9681 198.001 33.1722C197.477 33.3764 197.006 33.6972 196.625 34.1102C195.975 34.8829 195.651 36.0742 195.651 37.6841V45.701H193.477V36.3511C193.551 35.4311 193.287 34.5157 192.735 33.7754C192.435 33.4769 192.074 33.2469 191.677 33.1013C191.279 32.9557 190.855 32.8978 190.433 32.9318C189.867 32.8825 189.297 32.9684 188.771 33.1822C188.245 33.3961 187.778 33.7318 187.408 34.1617C186.763 34.9795 186.466 36.3189 186.466 38.167V45.701H184.254V31.3477H186.04L186.395 33.3117H186.498C186.916 32.6114 187.524 32.0441 188.253 31.6761C189.032 31.276 189.898 31.0726 190.775 31.0837C193.026 31.0837 194.503 31.8951 195.193 33.5114H195.315C195.759 32.753 196.41 32.1365 197.192 31.7341C198.051 31.2939 199.006 31.0727 199.972 31.0902C201.627 31.0902 202.857 31.5194 203.661 32.378C204.465 33.2366 204.865 34.5653 204.861 36.364V45.701Z" fill="white"/><path d="M209.228 52.1404C208.562 52.1394 207.898 52.0682 207.248 51.9279V50.1635C207.783 50.2712 208.327 50.3252 208.873 50.3245C210.376 50.3245 211.453 49.4809 212.098 47.8067L212.904 45.759L207.099 31.3478H209.44L212.607 39.5193C213.126 40.8376 213.556 42.1885 213.897 43.5632H214.001C214.123 43.0674 214.355 42.3268 214.691 41.3352C215.026 40.3435 216.232 37.0208 218.303 31.3478H220.65L214.439 47.6779C214.023 48.9786 213.287 50.1543 212.298 51.0972C211.436 51.8067 210.344 52.1776 209.228 52.1404Z" fill="white"/><path d="M132.7 73.3901V85.2964H124.315V53.5826H142.975V60.4727H132.7V66.5257H142.149V73.3901H132.7Z" fill="white"/><path d="M162.414 60.2862C163.28 60.3141 164.142 60.4023 164.994 60.5502L164.253 68.5543C163.305 68.3586 162.338 68.27 161.37 68.2903C157.852 68.2903 156.094 69.9366 156.094 73.2293V85.3095H147.644V60.7177H153.926L155.216 64.6457H155.629C156.332 63.3383 157.375 62.244 158.648 61.4775C159.765 60.7323 161.071 60.3192 162.414 60.2862Z" fill="white"/><path d="M177.21 54.6194C177.21 57.0921 175.706 58.3285 172.696 58.3285C169.686 58.3285 168.181 57.0921 168.181 54.6194C168.135 54.092 168.207 53.5611 168.391 53.0646C168.575 52.5681 168.867 52.1183 169.245 51.7474C169.954 51.1035 171.096 50.8331 172.65 50.8331C174.205 50.8331 175.353 51.1422 176.082 51.7732C176.471 52.1331 176.775 52.5757 176.97 53.0683C177.165 53.5608 177.248 54.0909 177.21 54.6194ZM176.875 60.7175V85.3093H168.432V60.7175H176.875Z" fill="white"/><path d="M194.574 85.7474C190.497 85.7474 187.332 84.6613 185.079 82.4891C182.826 80.3169 181.697 77.1744 181.693 73.0618C181.693 68.9793 182.734 65.8283 184.815 63.6089C186.896 61.3895 189.829 60.2819 193.612 60.2862C197.405 60.2862 200.303 61.2585 202.307 63.2032C204.311 65.1479 205.315 67.9275 205.319 71.5422V75.3221H190.252C190.249 75.935 190.381 76.5411 190.638 77.0975C190.895 77.6539 191.272 78.147 191.742 78.5417C192.806 79.3622 194.127 79.7777 195.47 79.7137C198.337 79.7707 201.174 79.125 203.732 77.8334V83.9315C202.464 84.6031 201.1 85.0786 199.688 85.3417C197.999 85.6321 196.287 85.7679 194.574 85.7474ZM196.663 67.1312C196.338 66.7761 195.938 66.4969 195.492 66.3133C195.046 66.1297 194.565 66.0462 194.083 66.0687C193.609 66.0462 193.135 66.1215 192.691 66.2899C192.247 66.4583 191.843 66.7162 191.503 67.0475C190.786 67.8578 190.382 68.8964 190.362 69.9774H197.605C197.656 68.9449 197.32 67.9304 196.663 67.1312Z" fill="white"/><path d="M233.95 85.3095H225.513V71.9028C225.513 68.6144 224.529 66.9681 222.559 66.9638C221.937 66.9271 221.317 67.0673 220.771 67.3682C220.226 67.6691 219.777 68.1184 219.476 68.6638C218.831 69.7971 218.509 71.7611 218.509 74.5558V85.3095H210.066V60.7177H216.445L217.503 63.757H217.987C219.427 61.4389 221.889 60.2819 225.372 60.2862C228.072 60.2862 230.175 61.0761 231.679 62.6559C233.184 64.2357 233.935 66.4594 233.931 69.3271L233.95 85.3095Z" fill="white"/><path d="M247.656 60.2863C248.91 60.2557 250.151 60.5461 251.261 61.1298C252.411 61.8053 253.373 62.7571 254.061 63.8987H254.228C253.957 61.9788 253.819 60.0423 253.815 58.1033V51.5545H262.329V85.3096H255.95L254.106 82.1994H253.77C253.092 83.2719 252.156 84.1584 251.047 84.7784C249.939 85.3983 248.693 85.732 247.423 85.7493C246.152 85.7666 244.897 85.4668 243.772 84.8772C242.647 84.2877 241.688 83.427 240.98 82.3732C239.385 80.0551 238.594 76.9191 238.607 72.9653C238.62 69.0116 239.426 65.91 241.025 63.6605C241.751 62.581 242.742 61.7046 243.902 61.1141C245.062 60.5236 246.354 60.2387 247.656 60.2863ZM248.107 68.696C247.427 70.0813 247.114 71.6178 247.198 73.1585C247.106 74.6784 247.424 76.1952 248.12 77.5502C248.422 77.9885 248.822 78.351 249.288 78.6093C249.754 78.8676 250.273 79.0147 250.805 79.039C251.338 79.0634 251.868 78.9643 252.356 78.7495C252.844 78.5348 253.275 78.2102 253.615 77.8013C254.183 76.9706 254.486 75.6441 254.538 73.8089V73.1328C254.538 70.9863 254.23 69.4516 253.615 68.5286C253.296 68.0601 252.858 67.6841 252.346 67.4388C251.834 67.1934 251.266 67.0873 250.7 67.1313C250.159 67.1171 249.625 67.2566 249.16 67.5336C248.696 67.8107 248.351 68.2138 248.107 68.696Z" fill="white"/><path d="M284.53 72.0252C286.172 73.313 286.996 75.2448 287 77.8206C287.004 80.3963 286.121 82.3539 284.349 83.6933C282.582 85.0455 280.013 85.7216 276.641 85.7216C275.061 85.7362 273.481 85.6393 271.914 85.4319C270.51 85.2234 269.134 84.8583 267.812 84.3436V77.5952C269.221 78.2182 270.688 78.7034 272.191 79.044C273.539 79.3729 274.919 79.55 276.306 79.5721C278.125 79.5721 279.041 79.1535 279.041 78.3164C279.025 78.0783 278.947 77.8484 278.816 77.6488C278.685 77.4492 278.505 77.2866 278.293 77.1766C276.848 76.4069 275.35 75.742 273.81 75.1869C271.54 74.221 269.964 73.1478 269.082 71.9672C268.173 70.6688 267.72 69.1066 267.792 67.5241C267.753 66.4864 267.974 65.4553 268.434 64.5242C268.895 63.5932 269.581 62.7917 270.43 62.1923C272.193 60.9044 274.588 60.2605 277.615 60.2605C280.802 60.2948 283.944 61.0083 286.832 62.3533L284.53 67.8267C283.384 67.3136 282.203 66.8832 280.995 66.5388C279.997 66.2227 278.959 66.0451 277.912 66.0108C276.538 66.0108 275.848 66.3457 275.848 67.0218C275.863 67.2488 275.937 67.4678 276.064 67.6567C276.191 67.8456 276.366 67.9976 276.571 68.0972C277.924 68.7841 279.318 69.3905 280.744 69.913C282.1 70.4344 283.374 71.1456 284.53 72.0252Z" fill="white"/></svg>`;


export function getMarqueePreset(rootName: string = 'Marquee'): ComponentSchemaDef {
  const itemSubComponent: ComponentNodeDef = {
    type: 'COMPONENT',
    name: `${rootName}/Item`,
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    itemSpacing: 24,
    itemSpacingVar: 'spacing/semi-large',
    paddingLeft: 24,
    paddingLeftVar: 'spacing/semi-large',
    paddingRight: 24,
    paddingRightVar: 'spacing/semi-large',
    paddingTop: 0,
    paddingBottom: 0,
    paddingTopVar: 'constant/none',
    paddingBottomVar: 'constant/none',
    cornerRadius: 0,
    cornerRadiusVar: 'constant/none',
    fills: [],
    children: [
      {
        type: 'TEXT',
        name: `${rootName}Text`,
        textStyleName: 'default/body/medium/bold',
        characters: '20 YEARS OF MAMF',
        fontStyle: 'Bold',
        fontSize: 16,
        letterSpacing: 10,
        textCase: 'UPPER',
        fills: dsRegistry.getFill('on-primary-unstable'),
      },
      {
        type: 'INSTANCE',
        name: `${rootName}Logo`,
        componentName: 'Logotype',
        variantProperties: {
          Size: 'SemiLarge',
          Schemes: 'OnSurfaceDarkWhite',
        },
        svgContent: MAMF_LOGO_LIGHT_SVG,
      },
    ],
  };

  const buildTickerItems = (count: number): ComponentNodeDef[] => {
    const items: ComponentNodeDef[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        type: 'INSTANCE',
        name: `${rootName}/Item`,
        componentName: `${rootName}/Item`,
      });
    }
    return items;
  };

  return {
    name: rootName,
    description: `Animated ${rootName} component with continuous marquee motion.`,
    subComponents: [itemSubComponent],
    variants: [
      {
        name: 'Type=Desktop',
        width: 1440,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'FIXED',
        counterAxisSizingMode: 'AUTO',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'CENTER',
        paddingTop: 8,
        paddingBottom: 8,
        paddingTopVar: 'spacing/extra-small',
        paddingBottomVar: 'spacing/extra-small',
        paddingLeft: 0,
        paddingRight: 0,
        paddingLeftVar: 'constant/none',
        paddingRightVar: 'constant/none',
        cornerRadius: 0,
        cornerRadiusVar: 'constant/none',
        clipsContent: true,
        fills: dsRegistry.getFill('primary'),
        strokes: [],
        strokeTopWeight: 0,
        strokeBottomWeight: 0,
        strokeLeftWeight: 0,
        strokeRightWeight: 0,
        children: [
          {
            type: 'FRAME',
            name: `${rootName}/Track`,
            layoutMode: 'HORIZONTAL',
            primaryAxisSizingMode: 'AUTO',
            counterAxisSizingMode: 'AUTO',
            primaryAxisAlignItems: 'CENTER',
            counterAxisAlignItems: 'CENTER',
            itemSpacing: 0,
            itemSpacingVar: 'constant/none',
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTopVar: 'constant/none',
            paddingBottomVar: 'constant/none',
            paddingLeftVar: 'constant/none',
            paddingRightVar: 'constant/none',
            cornerRadius: 0,
            cornerRadiusVar: 'constant/none',
            fills: [],
            children: buildTickerItems(6),
          },
        ],
      },
      {
        name: 'Type=Mobile',
        width: 393,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'FIXED',
        counterAxisSizingMode: 'AUTO',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'CENTER',
        paddingTop: 4,
        paddingBottom: 4,
        paddingTopVar: 'spacing/pico',
        paddingBottomVar: 'spacing/pico',
        paddingLeft: 0,
        paddingRight: 0,
        paddingLeftVar: 'constant/none',
        paddingRightVar: 'constant/none',
        cornerRadius: 0,
        cornerRadiusVar: 'constant/none',
        clipsContent: true,
        fills: dsRegistry.getFill('primary'),
        strokes: [],
        strokeTopWeight: 0,
        strokeBottomWeight: 0,
        strokeLeftWeight: 0,
        strokeRightWeight: 0,
        children: [
          {
            type: 'FRAME',
            name: `${rootName}/Track`,
            layoutMode: 'HORIZONTAL',
            primaryAxisSizingMode: 'AUTO',
            counterAxisSizingMode: 'AUTO',
            primaryAxisAlignItems: 'CENTER',
            counterAxisAlignItems: 'CENTER',
            itemSpacing: 0,
            itemSpacingVar: 'constant/none',
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTopVar: 'constant/none',
            paddingBottomVar: 'constant/none',
            paddingLeftVar: 'constant/none',
            paddingRightVar: 'constant/none',
            cornerRadius: 0,
            cornerRadiusVar: 'constant/none',
            fills: [],
            children: buildTickerItems(4),
          },
        ],
      },
    ],
  };
}

export async function handleGenerateComponent(schema: ComponentSchemaDef, force: boolean = false) {
  if (!schema || !schema.variants || schema.variants.length === 0) {
    figma.notify('Invalid component schema: missing variants', { error: true });
    return;
  }

  const engine = new VariableEngine();
  await engine.init();

  if (!force) {
    const missingStyles = new Set<string>();
    const checkNode = (n: ComponentNodeDef) => {
      if (n.type === 'TEXT' && n.textStyleName) {
        const found = engine.findTextStyle(n.textStyleName);
        if (!found) {
          missingStyles.add(n.textStyleName);
        }
      }
      if (n.children) {
        for (const c of n.children) checkNode(c);
      }
    };

    if (schema.subComponents) {
      for (const s of schema.subComponents) checkNode(s);
    }
    if (schema.variants) {
      for (const v of schema.variants) checkNode(v);
    }

    if (missingStyles.size > 0) {
      const missingList = Array.from(missingStyles);
      figma.ui.postMessage({
        type: 'missing-text-styles-confirm',
        missingStyles: missingList,
        componentName: schema.name,
        schema,
      });
      figma.notify(`⚠️ Nie odnaleziono stylu tekstu: ${missingList.join(', ')}`, { timeout: 6000 });
      return;
    }
  }

  const subComponentMasters = new Map<string, ComponentNode>();

  // Generate or update reusable subcomponents if declared in schema
  if (schema.subComponents && schema.subComponents.length > 0) {
    let subX = figma.viewport.center.x - 450;
    let subY = figma.viewport.center.y;

    for (const subDef of schema.subComponents) {
      const subName = subDef.name || 'SubComponent';
      let compNode: ComponentNode | null = null;
      const found = figma.currentPage.findOne((n) => n.type === 'COMPONENT' && n.name === subName);
      if (found && found.type === 'COMPONENT') {
        compNode = found as ComponentNode;
      } else {
        compNode = figma.createComponent();
        compNode.name = subName;
        compNode.x = subX;
        compNode.y = subY;
      }

      if (subDef.width && subDef.height) {
        compNode.resize(subDef.width, subDef.height);
      }

      if (subDef.layoutMode && subDef.layoutMode !== 'NONE') {
        compNode.layoutMode = subDef.layoutMode;
        if (subDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = subDef.primaryAxisSizingMode;
        if (subDef.counterAxisSizingMode) compNode.counterAxisSizingMode = subDef.counterAxisSizingMode;
        if (subDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = subDef.primaryAxisAlignItems;
        if (subDef.counterAxisAlignItems) compNode.counterAxisAlignItems = subDef.counterAxisAlignItems;
        compNode.itemSpacing = subDef.itemSpacing ?? 0;
        compNode.paddingTop = subDef.paddingTop ?? 0;
        compNode.paddingBottom = subDef.paddingBottom ?? 0;
        compNode.paddingLeft = subDef.paddingLeft ?? 0;
        compNode.paddingRight = subDef.paddingRight ?? 0;
      }

      if (subDef.clipsContent !== undefined) {
        compNode.clipsContent = subDef.clipsContent;
      }

      if (subDef.cornerRadius !== undefined) {
        compNode.cornerRadius = subDef.cornerRadius;
        compNode.cornerSmoothing = 0.6;
      }

      if (subDef.fills && subDef.fills.length > 0) {
        compNode.fills = subDef.fills.map((f) => ({
          type: 'SOLID',
          color: parseHexOrRgb(f.color || f.hex),
          opacity: f.opacity ?? 1,
        }));
      } else {
        compNode.fills = [];
      }

      if (subDef.strokes && subDef.strokes.length > 0) {
        compNode.strokes = subDef.strokes.map((s) => ({
          type: 'SOLID',
          color: parseHexOrRgb(s.color || s.hex),
          opacity: s.opacity ?? 1,
        }));
        if (subDef.strokeWeight !== undefined) compNode.strokeWeight = subDef.strokeWeight;
      }

      while (compNode.children.length > 0) {
        compNode.children[0].remove();
      }

      if (subDef.children && subDef.children.length > 0) {
        for (const childDef of subDef.children) {
          await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
        }
      }

      await engine.bindNodeVariables(compNode, subDef);
      await engine.bindVariablesRecursively(compNode);

      subComponentMasters.set(subName, compNode);
      subY += compNode.height + 40;
    }
  }

  // 1. Check if a ComponentSet with schema.name already exists in selection or on the current page
  let existingSet: ComponentSetNode | null = null;
  const currentSel = figma.currentPage.selection;
  for (const node of currentSel) {
    if (node.type === 'COMPONENT_SET' && node.name.toLowerCase() === schema.name.toLowerCase()) {
      existingSet = node as ComponentSetNode;
      break;
    }
    if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET' && node.parent.name.toLowerCase() === schema.name.toLowerCase()) {
      existingSet = node.parent as ComponentSetNode;
      break;
    }
  }
  if (!existingSet) {
    const found = figma.currentPage.findOne((n) => n.type === 'COMPONENT_SET' && n.name.toLowerCase() === schema.name.toLowerCase());
    if (found) existingSet = found as ComponentSetNode;
  }

  if (existingSet) {
    figma.notify(`Updating existing "${existingSet.name}" with design system variables... ⏳`);

    const variantsInSet = existingSet.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
    const updatedVariants: ComponentNode[] = [];

    for (const variantDef of schema.variants) {
      let compNode = variantsInSet.find((v) => v.name.toLowerCase() === (variantDef.name || '').toLowerCase());
      if (compNode) {
        if (variantDef.width && variantDef.height) {
          compNode.resize(variantDef.width, variantDef.height);
        }
        if (variantDef.layoutMode && variantDef.layoutMode !== 'NONE') {
          compNode.layoutMode = variantDef.layoutMode;
          if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
          if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
          if (variantDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = variantDef.primaryAxisAlignItems;
          if (variantDef.counterAxisAlignItems) compNode.counterAxisAlignItems = variantDef.counterAxisAlignItems;
          compNode.itemSpacing = variantDef.itemSpacing ?? 0;
          compNode.paddingTop = variantDef.paddingTop ?? 0;
          compNode.paddingBottom = variantDef.paddingBottom ?? 0;
          compNode.paddingLeft = variantDef.paddingLeft ?? 0;
          compNode.paddingRight = variantDef.paddingRight ?? 0;
        }
        if (variantDef.cornerRadius !== undefined) {
          compNode.cornerRadius = variantDef.cornerRadius;
          compNode.cornerSmoothing = 0.6;
        }
        if (variantDef.fills && variantDef.fills.length > 0) {
          compNode.fills = variantDef.fills.map((f) => ({
            type: 'SOLID',
            color: parseHexOrRgb(f.color || f.hex),
            opacity: f.opacity ?? 1,
          }));
        }
        if (variantDef.strokes && variantDef.strokes.length > 0) {
          compNode.strokes = variantDef.strokes.map((s) => ({
            type: 'SOLID',
            color: parseHexOrRgb(s.color || s.hex),
            opacity: s.opacity ?? 1,
          }));
          if (variantDef.strokeWeight !== undefined) compNode.strokeWeight = variantDef.strokeWeight;
          if (variantDef.strokeTopWeight !== undefined) compNode.strokeTopWeight = variantDef.strokeTopWeight;
          if (variantDef.strokeBottomWeight !== undefined) compNode.strokeBottomWeight = variantDef.strokeBottomWeight;
          if (variantDef.strokeLeftWeight !== undefined) compNode.strokeLeftWeight = variantDef.strokeLeftWeight;
          if (variantDef.strokeRightWeight !== undefined) compNode.strokeRightWeight = variantDef.strokeRightWeight;
        }

        if (variantDef.children && variantDef.children.length > 0) {
          while (compNode.children.length > 0) {
            compNode.children[0].remove();
          }
          for (const childDef of variantDef.children) {
            await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
          }
        }

        if (variantDef.layoutMode && variantDef.layoutMode !== 'NONE') {
          if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
          if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
        }

        if (variantDef.width) {
          if (variantDef.counterAxisSizingMode === 'AUTO') {
            compNode.resize(variantDef.width, compNode.height);
          } else if (variantDef.height) {
            compNode.resize(variantDef.width, variantDef.height);
          }
        }

        await engine.bindNodeVariables(compNode, variantDef);
        await engine.bindVariablesRecursively(compNode);
        updatedVariants.push(compNode);
      } else {
        const newComp = figma.createComponent();
        newComp.name = variantDef.name || 'type=default';
        if (variantDef.width && variantDef.height) newComp.resize(variantDef.width, variantDef.height);
        if (variantDef.children && variantDef.children.length > 0) {
          for (const childDef of variantDef.children) {
            await buildFigmaNode(childDef, newComp, engine, subComponentMasters);
          }
        }
        if (variantDef.layoutMode && variantDef.layoutMode !== 'NONE') {
          if (variantDef.primaryAxisSizingMode) newComp.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
          if (variantDef.counterAxisSizingMode) newComp.counterAxisSizingMode = variantDef.counterAxisSizingMode;
        }
        if (variantDef.width) {
          if (variantDef.counterAxisSizingMode === 'AUTO') {
            newComp.resize(variantDef.width, newComp.height);
          } else if (variantDef.height) {
            newComp.resize(variantDef.width, variantDef.height);
          }
        }
        await engine.bindNodeVariables(newComp, variantDef);
        existingSet.appendChild(newComp);
        updatedVariants.push(newComp);
      }
    }

    await setupComponentSets([existingSet]);
    await applyVariantMetrics(existingSet.children.filter((c) => c.type === 'COMPONENT') as ComponentNode[]);
    sanitizeComponentProperties(existingSet);
    sanitizeLayerNames(existingSet);

    figma.currentPage.selection = [existingSet];
    figma.viewport.scrollAndZoomIntoView([existingSet]);
    figma.notify(`Updated existing "${schema.name}" with design system variables! ✨`);
    return;
  }

  figma.notify(`Generating "${schema.name}" on canvas with design system variables... ⏳`);

  const createdComponents: ComponentNode[] = [];
  const startX = figma.viewport.center.x;
  let currentY = figma.viewport.center.y;

  for (const variantDef of schema.variants) {
    const compNode = figma.createComponent();
    compNode.name = variantDef.name || 'type=default';
    compNode.x = startX;
    compNode.y = currentY;

    if (variantDef.width && variantDef.height) {
      compNode.resize(variantDef.width, variantDef.height);
    }

    if (variantDef.layoutMode && variantDef.layoutMode !== 'NONE') {
      compNode.layoutMode = variantDef.layoutMode;
      if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
      if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
      if (variantDef.primaryAxisAlignItems) compNode.primaryAxisAlignItems = variantDef.primaryAxisAlignItems;
      if (variantDef.counterAxisAlignItems) compNode.counterAxisAlignItems = variantDef.counterAxisAlignItems;
      compNode.itemSpacing = variantDef.itemSpacing ?? 0;
      compNode.paddingTop = variantDef.paddingTop ?? 0;
      compNode.paddingBottom = variantDef.paddingBottom ?? 0;
      compNode.paddingLeft = variantDef.paddingLeft ?? 0;
      compNode.paddingRight = variantDef.paddingRight ?? 0;
    }

    if (variantDef.clipsContent !== undefined) {
      compNode.clipsContent = variantDef.clipsContent;
    }

    if (variantDef.cornerRadius !== undefined) {
      compNode.cornerRadius = variantDef.cornerRadius;
      compNode.cornerSmoothing = 0.6;
    }

    if (variantDef.fills && variantDef.fills.length > 0) {
      compNode.fills = variantDef.fills.map((f) => ({
        type: 'SOLID',
        color: parseHexOrRgb(f.color || f.hex),
        opacity: f.opacity ?? 1,
      }));
    } else {
      compNode.fills = [];
    }

    if (variantDef.strokes && variantDef.strokes.length > 0) {
      compNode.strokes = variantDef.strokes.map((s) => ({
        type: 'SOLID',
        color: parseHexOrRgb(s.color || s.hex),
        opacity: s.opacity ?? 1,
      }));
      if (variantDef.strokeWeight !== undefined) compNode.strokeWeight = variantDef.strokeWeight;
      if (variantDef.strokeTopWeight !== undefined) compNode.strokeTopWeight = variantDef.strokeTopWeight;
      if (variantDef.strokeBottomWeight !== undefined) compNode.strokeBottomWeight = variantDef.strokeBottomWeight;
      if (variantDef.strokeLeftWeight !== undefined) compNode.strokeLeftWeight = variantDef.strokeLeftWeight;
      if (variantDef.strokeRightWeight !== undefined) compNode.strokeRightWeight = variantDef.strokeRightWeight;
    }

    if (variantDef.children && variantDef.children.length > 0) {
      for (const childDef of variantDef.children) {
        await buildFigmaNode(childDef, compNode, engine, subComponentMasters);
      }
    }

    if (variantDef.layoutMode && variantDef.layoutMode !== 'NONE') {
      if (variantDef.primaryAxisSizingMode) compNode.primaryAxisSizingMode = variantDef.primaryAxisSizingMode;
      if (variantDef.counterAxisSizingMode) compNode.counterAxisSizingMode = variantDef.counterAxisSizingMode;
    }

    // Re-enforce dimensions after children are mounted
    if (variantDef.width) {
      if (variantDef.counterAxisSizingMode === 'AUTO') {
        compNode.resize(variantDef.width, compNode.height);
      } else if (variantDef.height) {
        compNode.resize(variantDef.width, variantDef.height);
      }
    }

    // Bind variables on variant root
    await engine.bindNodeVariables(compNode, variantDef);

    createdComponents.push(compNode);
    currentY += compNode.height + 48;
  }

  let finalSelection: SceneNode;
  const parent = figma.currentPage;
  const componentSet = figma.combineAsVariants(createdComponents, parent);
  componentSet.name = schema.name;
  if (schema.description) {
    componentSet.description = schema.description;
  }

  // Run the EXACT same logic as the plugin's "Apply" action:
  // 1. ComponentSet layout, padding, radius, dashed outline, metrics bindings
  await setupComponentSets([componentSet]);
  // 2. Apply variant metrics to each variant component
  await applyVariantMetrics(createdComponents);
  // 3. Sanitize component properties and layer names
  sanitizeComponentProperties(componentSet);
  sanitizeLayerNames(componentSet);

  finalSelection = componentSet;

  figma.currentPage.selection = [finalSelection];
  figma.viewport.scrollAndZoomIntoView([finalSelection]);
  figma.notify(`Created Component Set "${schema.name}" with full Apply rules & variables! ✨`);
}

export function getButtonPreset(): ComponentSchemaDef {
  const arrowSvg = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="12" y2="4" /><polyline points="6 4 12 4 12 10" /></svg>`;
  return {
    name: 'Button',
    description: 'Design System Button component with variants & text styles.',
    variants: [
      {
        name: 'size=small, style=filled',
        height: 44,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 8,
        itemSpacingVar: 'spacing/small',
        paddingLeft: 16,
        paddingRight: 16,
        paddingLeftVar: 'spacing/base',
        paddingRightVar: 'spacing/base',
        cornerRadius: 22,
        cornerRadiusVar: 'radius/small',
        fills: dsRegistry.getFill('primary'),
        children: [
          {
            type: 'TEXT',
            name: 'label',
            textStyleName: 'default/body/medium/bold',
            characters: 'Button',
            fontStyle: 'Bold',
            fontSize: 14,
            fills: dsRegistry.getFill('on-primary-unstable'),
          },
          {
            type: 'SVG',
            name: 'ArrowIcon',
            svgContent: arrowSvg,
            width: 16,
            height: 16,
          },
        ],
      },
      {
        name: 'size=medium, style=filled',
        height: 48,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 10,
        itemSpacingVar: 'spacing/small',
        paddingLeft: 20,
        paddingRight: 20,
        paddingLeftVar: 'spacing/medium',
        paddingRightVar: 'spacing/medium',
        cornerRadius: 24,
        cornerRadiusVar: 'radius/base',
        fills: dsRegistry.getFill('primary'),
        children: [
          {
            type: 'TEXT',
            name: 'label',
            textStyleName: 'default/body/large/bold',
            characters: 'Button',
            fontStyle: 'Bold',
            fontSize: 16,
            fills: dsRegistry.getFill('on-primary-unstable'),
          },
          {
            type: 'SVG',
            name: 'ArrowIcon',
            svgContent: arrowSvg,
            width: 16,
            height: 16,
          },
        ],
      },
      {
        name: 'size=large, style=filled',
        height: 56,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 12,
        itemSpacingVar: 'spacing/base',
        paddingLeft: 24,
        paddingRight: 24,
        paddingLeftVar: 'spacing/semi-large',
        paddingRightVar: 'spacing/semi-large',
        cornerRadius: 28,
        cornerRadiusVar: 'radius/large',
        fills: dsRegistry.getFill('primary'),
        children: [
          {
            type: 'TEXT',
            name: 'label',
            textStyleName: 'default/body/large/bold',
            characters: 'Button',
            fontStyle: 'Bold',
            fontSize: 16,
            fills: dsRegistry.getFill('on-primary-unstable'),
          },
          {
            type: 'SVG',
            name: 'ArrowIcon',
            svgContent: arrowSvg,
            width: 16,
            height: 16,
          },
        ],
      },
      {
        name: 'size=medium, style=outline',
        height: 48,
        layoutMode: 'HORIZONTAL',
        primaryAxisSizingMode: 'AUTO',
        counterAxisSizingMode: 'FIXED',
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        itemSpacing: 10,
        itemSpacingVar: 'spacing/small',
        paddingLeft: 20,
        paddingRight: 20,
        paddingLeftVar: 'spacing/medium',
        paddingRightVar: 'spacing/medium',
        cornerRadius: 24,
        cornerRadiusVar: 'radius/base',
        fills: [],
        strokes: dsRegistry.getStroke('outline-base', 0.6),
        strokeWeight: 1,
        children: [
          {
            type: 'TEXT',
            name: 'label',
            textStyleName: 'default/body/large/bold',
            characters: 'Button',
            fontStyle: 'Bold',
            fontSize: 16,
            fills: dsRegistry.getFill('on-surface'),
          },
          {
            type: 'SVG',
            name: 'ArrowIcon',
            svgContent: arrowSvg,
            width: 16,
            height: 16,
          },
        ],
      },
    ],
  };
}

export async function handleGeneratePreset(presetName: string, force: boolean = false) {
  if (presetName === 'Marquee') {
    const schema = getMarqueePreset();
    await handleGenerateComponent(schema, force);
  } else if (presetName === 'Button') {
    const schema = getButtonPreset();
    await handleGenerateComponent(schema, force);
  } else {
    figma.notify(`Preset "${presetName}" not found`, { error: true });
  }
}

// ==========================================
// TEXT CASE CONVERTER - PURE ALGORITHMIC ENGINE
// ==========================================
