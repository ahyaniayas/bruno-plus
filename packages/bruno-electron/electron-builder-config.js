require('dotenv').config({ path: process.env.DOTENV_PATH });

const isBenchmark = process.env.BRUNO_BENCHMARK === 'true';

const config = {
  appId: 'com.brunoplus.app',
  productName: isBenchmark ? 'Bruno Plus Benchmark' : 'Bruno Plus',
  extraMetadata: {
    brunoBuild: {
      benchmark: isBenchmark,
      builtAt: new Date().toISOString()
    }
  },
  electronVersion: '37.6.1',
  directories: {
    buildResources: 'resources',
    output: 'out'
  },
  extraResources: [
    {
      from: 'resources/data/sample-collection.json',
      to: 'data/sample-collection.json'
    }
  ],
  files: ['**/*'],
  // Notarize only when Apple credentials are provided (CI with secrets).
  afterSign: process.env.APPLE_ID ? 'notarize.js' : undefined,
  mac: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'resources/icons/mac/icon.icns',
    // Ad-hoc signature unless a Developer ID is supplied via env.
    hardenedRuntime: !!process.env.CSC_NAME,
    identity: process.env.CSC_NAME || null,
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    notarize: false,
    requirements: 'resources/app-requirements.txt',
    protocols: [
      {
        name: 'Bruno',
        schemes: [
          'bruno'
        ]
      }
    ]
  },
  dmg: {
    window: {
      width: 540,
      height: 440
    },
    contents: [
      {
        x: 130,
        y: 180,
        type: 'file'
      },
      {
        x: 410,
        y: 180,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 180,
        y: 330,
        type: 'file',
        path: 'Fix-Damaged-App.command',
        name: 'Fix-Damaged-App.command'
      },
      {
        x: 360,
        y: 330,
        type: 'file',
        path: 'Instructions.txt',
        name: 'Instructions.txt'
      }
    ]
  },
  linux: {
    artifactName: '${name}_${version}_${arch}_${os}.${ext}',
    icon: 'resources/icons/png',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    protocols: [
      {
        name: 'Bruno',
        schemes: ['bruno']
      }
    ],
    category: 'Development',
    desktop: {
      MimeType: 'x-scheme-handler/bruno;'
    }
  },
  deb: {
    // Docs: https://www.electron.build/configuration/linux#debian-package-options
    depends: [
      'libgtk-3-0',
      'libnotify4',
      'libnss3',
      'libxss1',
      'libxtst6',
      'xdg-utils',
      'libatspi2.0-0',
      'libuuid1',
      'libsecret-1-0',
      'libasound2' // #1036
    ]
  },
  // Bundle git so Snap/sandbox installs can find it (#5667)
  snap: {
    stagePackages: ['default', 'git'],
    // electron-builder's app part strips usr/bin, so expose git from git-core
    environment: {
      PATH: '$SNAP/usr/lib/git-core:$SNAP/usr/sbin:$SNAP/usr/bin:$SNAP/sbin:$SNAP/bin:$PATH',
      GIT_EXEC_PATH: '$SNAP/usr/lib/git-core'
    }
  },
  win: {
    artifactName: '${name}_${version}_${arch}_win.${ext}',
    icon: 'resources/icons/win/icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    sign: null,
    publisherName: 'Bruno Plus'
  },
  nsis: {
    include: 'resources/installer.nsh',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  pkg: {
    installLocation: '/Applications',
    isRelocatable: false
  }
};

module.exports = config;
