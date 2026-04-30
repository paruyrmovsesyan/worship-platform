(function () {
  var STORAGE_KEY = "wp_language";
  var QUERY_KEY = "lang";
  var SUPPORTED = ["hy", "ru", "en"];

  var dict = {
    hy: {
      langLabel: "Հայ",
      common: {
        home: "ԳԼԽԱՎՈՐ",
        songs: "ԵՐԳԵՐ",
        favorites: "ՊԱՀՊԱՆԱԾ ԵՐԳԵՐ",
        news: "ՆՈՐՈՒԹՅՈՒՆՆԵՐ",
        setlists: "ՍԵԹԼԻՍՏՆԵՐ",
        account: "Հաշիվ",
        login: "Մուտք",
        register: "Գրանցում",
        logout: "Դուրս գալ",
        theme: "Թեմա",
        language: "Լեզու"
      },
      pages: {
        index: {
          metaTitle: "Worship Platform — Քրիստոնեական փառաբանության երգեր, ակորդներ և սեթլիստներ",
          metaDescription: "Գտիր քրիստոնեական փառաբանության երգեր, ակորդներ, բառեր և սեթլիստներ Worship Platform-ում։ Օգտագործիր կայքում կամ ծրագրում։",
          heroText: "Երգեր • Ակկորդներ • Ծառայություն<br>ստեղծված worship թիմերի համար",
          cta: "Սկսել Worship-ը",
          purposeTitle: "Կայքի նպատակը",
          purpose1Title: "Worship-ի համար",
          purpose1Text: "Ստեղծված worship ծառայությունների և թիմերի փորձի հիման վրա",
          purpose2Title: "Երգեր և ակկորդներ",
          purpose2Text: "Առանձին էջում՝ մաքուր և հարմար ներկայացմամբ",
          purpose3Title: "Արագ և պարզ",
          purpose3Text: "Առանց ավելորդ բարդությունների՝ հարմար worship-ի վրա",
          featuresTitle: "Ինչ կարող եք անել կայքում",
          features1Title: "Տեսնել ակկորդներ",
          features1Text: "Գործիքների համար հարմար դասավորությամբ",
          features2Title: "Կարդալ բառերը",
          features2Text: "Մեծ, պարզ տեքստ՝ ծառայության ժամանակ օգտագործելու համար",
          features3Title: "Տրանսպոզիցիա",
          features3Text: "Կարող եք փոխել տոնայնությունը։ Հարմար բոլոր երգիչների և գործիքների համար",
          chooseTitle: "Ինչու՞ ընտրել այս կայքը",
          choose1Title: "Պարզ ակկորդներ",
          choose1Text: "Հարմար բոլոր գործիքների և band-ի համար",
          choose2Title: "Ժամանակակից UX",
          choose2Text: "Հարմար օգտագործում ցանկացած սարքից",
          choose3Title: "Ծառայություն",
          choose3Text: "Ստեղծված worship թիմերի իրական կարիքների համար",
          story1Title: "Բեմից դեպի ծառայություն",
          story1Text: "Ստեղծված է worship բեմի իրական փորձից, որպեսզի երաժիշտը կենտրոնանա ոչ թե տեխնիկայի, այլ Աստծո ներկայության վրա։",
          story2Title: "Երգը քո ձեռքում",
          story2Text: "Բառեր, ակկորդներ և ազատություն ցանկացած տոնալության մեջ։",
          footerBrand: "Երգեր • Ակորդներ • Ծառայություն<br>ստեղծված worship թիմերի համար",
          footerSections: "Բաժիններ",
          footerFeatures: "ՀՆԱՐԱՎՈՐՈՒԹՅՈՒՆՆԵՐ",
          footerContact: "ԿԱՊ",
          footerFollow: "Հետևիր մեզ",
          updateTitle: "🚀 Կայքի նոր տարբերակ",
          updateText: "Կայքը թարմացվել է։ Խնդրում ենք թարմացնել էջը նոր ֆունկցիաների համար։",
          updateButton: "Թարմացնել"
        },
        main: {
          metaTitle: "Երգեր — Worship Platform | Քրիստոնեական երգեր, ակորդներ և բառեր",
          metaDescription: "Բացիր Worship Platform-ի երգերի գրադարանը, գտիր քրիստոնեական երգեր, ակորդներ, բառեր և ընտրիր քեզ անհրաժեշտ տոնայնությունը։",
          headerTitle: "Երգերի գրադարան",
          headerText: "Որոնիր, բացիր և օգտագործիր երգերը worship ծառայության ընթացքում",
          searchPlaceholder: "Որոնել երգ անունով, հեղինակի կամ տեգի միջոցով",
          tableTitle: "Երգերի ցանկ",
          columnName: "Անուն",
          columnKey: "Տոնը",
          columnTag: "Տեգ",
          columnAction: "Գործողություն",
          modeMeta: "Վերնագիր+Տեգ",
          modeLyrics: "Բառեր",
          modeTitle: "Փոխել որոնման ռեժիմը"
        },
        favorites: {
          metaTitle: "Պահպանված երգեր — Worship Platform",
          metaDescription: "Բացիր Worship Platform-ի պահպանված երգերը, վերջերս դիտվածները և օգտվիր PDF արտահանման հնարավորությունից։",
          headerTitle: "Պահպանած երգերի ցանկ",
          headerText: "Favorites • Ակորդներ • Ծառայություն",
          searchPlaceholder: "Որոնել պահպանած երգը — Օր. Մեր սուրբ Աստված",
          exportPdf: "📄 PDF Export",
          guestTitle: "Պահպանած երգերը հասանելի են միայն մուտք գործելուց հետո",
          guestText: "Երգերը պահպանելու, պահպանածների ցանկը տեսնելու, PDF export անելու և setlist օգտագործելու համար նախ պետք է մուտք գործես։",
          guestLogin: "Մուտք գործել",
          guestRegister: "Գրանցում",
          mySongs: "Իմ երգերը",
          recentSongs: "Վերջին դիտված երգեր",
          clear: "Մաքրել",
          footerBrand: "Երգեր • Ակորդներ • Ծառայություն<br>ստեղծված worship թիմերի համար",
          footerSections: "Բաժիններ",
          footerFeatures: "ՀՆԱՐԱՎՈՐՈՒԹՅՈՒՆՆԵՐ",
          footerContact: "ԿԱՊ",
          footerFollow: "Հետևիր մեզ",
          updateTitle: "🚀 Կայքի նոր տարբերակ",
          updateText: "Կայքը թարմացվել է։ Խնդրում ենք թարմացնել էջը նոր ֆունկցիաների համար։",
          updateButton: "Թարմացնել"
        },
        account: {
          metaTitle: "Հաշիվ — Worship Platform",
          metaDescription: "Կառավարիր Worship Platform-ի օգտահաշիվը, անվտանգությունը, push ծանուցումները և ակտիվ սեսիաները։",
          title: "Օգտահաշիվ",
          subtitle: "Կարգավորիր անունը, էլ. փոստը և գաղտնաբառը։",
          quickLogout: "Դուրս գալ",
          profile: "Պրոֆիլ",
          name: "Անուն",
          namePlaceholder: "Քո անունը",
          email: "Էլ.փոստ",
          emailHint: "Email-ը փոխելու համար օգտագործիր ներքևի «Էլ․ փոստի հաստատում» բաժինը։",
          save: "Պահպանել",
          refresh: "Թարմացնել",
          security: "Անվտանգություն",
          currentPassword: "Ներկայիս գաղտնաբառ",
          newPassword: "Նոր գաղտնաբառ (մին. 8 նիշ)",
          changePassword: "Փոխել գաղտնաբառը",
          forgotPassword: "Մոռացել եմ գաղտնաբառը",
          emailVerify: "Էլ․ փոստի հաստատում",
          emailVerifyText: "Հաստատված Էլ. փոստը պետք է «Forgot password» և անվտանգության համար։",
          emailSavePlaceholder: "name@example.com",
          emailSaveHint: "Եթե փոխես Էլ. փոստը՝ նորից պետք է հաստատվի։",
          sendVerify: "Ուղարկել հաստատման նամակ",
          saveEmail: "Պահպանել Էլ. փոստը",
          push: "Push ծանուցումներ",
          pushText: "Push ծանուցումները հասանելի են միայն տեղադրված ծրագրի համար, ոչ սովորական կայքի browser տարբերակում։",
          enablePush: "Միացնել ծանուցումները",
          disablePush: "Անջատել ծանուցումները",
          sessions: "Ակտիվ սեսիաներ",
          sessionsText: "Այստեղ կտեսնես այն սարքերը, որտեղ բացված է քո հաշիվը։",
          currentDevice: "Այս սարքը կնշվի որպես «Ընթացիկ սարք»։",
          currentDeviceHint: "Սեսիաները կարող ես փակել մեկ առ մեկ կամ բոլոր մյուսները միասին։",
          closeOtherSessions: "Փակել մյուս սեսիաները",
          dangerZone: "Վտանգավոր գործողություն",
          dangerText: "Օգտահաշվի ջնջումը անշրջելի է։ Կկորչեն պահպանած երգերը և տվյալները։",
          deleteAccount: "Ջնջել օգտահաշիվը",
          confirm: "Հաստատում",
          confirmText: "Սա կջնջի քո օգտահաշիվը և տվյալները։ Շարունակելու համար գրիր գաղտնաբառը։",
          cancel: "Չեղարկել",
          deleteForever: "Ջնջել վերջնականապես"
        },
        login: {
          title: "Մուտք",
          loginPlaceholder: "Մուտքանուն կամ Էլ. փոստ",
          passwordPlaceholder: "Գաղտնաբառ",
          rememberMe: "Հիշել ինձ",
          noAccount: "Չունե՞ս հաշիվ",
          submit: "Մուտք",
          continueWith: "կամ շարունակիր",
          forgotPassword: "Անուն կամ գաղտնաբառ մոռացե՞լ եք",
          backHome: "← Հետ գլխավոր էջ",
          feature1Title: "Պահպանված երգեր",
          feature1Text: "Քո ընտրած երգերը միշտ կապվում են հաշվին։",
          feature2Title: "Սեթլիստներ",
          feature2Text: "Ծառայության երգացանկը հասանելի է նույն հաշվից։",
          feature3Title: "Push",
          feature3Text: "Ծրագրի թարմացումները և հայտարարությունները գալիս են հենց ներսում։",
          feature4Title: "Օֆֆլայն",
          feature4Text: "Մուտքից հետո ծրագրային փորձը մնում է ավելի ամբողջական և հարմար։",
          socialReady: "Պատրաստ է մուտքի համար",
          socialDisabled: "Միացրու ադմինից, որպեսզի աշխատի"
        },
        register: {
          title: "Գրանցում",
          namePlaceholder: "Անուն",
          loginPlaceholder: "Մուտքանուն կամ Էլ. փոստ",
          emailPlaceholder: "Էլ. փոստ",
          passwordPrefix: "Գաղտնաբառ (>=",
          passwordSuffix: " նիշ)",
          submit: "Գրանցվել",
          hasAccount: "Արդեն ունե՞ս հաշիվ",
          continueWith: "կամ շարունակիր",
          backHome: "← Հետ գլխավոր էջ",
          feature1Title: "Պահպանված երգեր",
          feature1Text: "Սիրած երգերը կպահվեն հենց քո հաշվին։",
          feature2Title: "Սեթլիստներ",
          feature2Text: "Ծառայությունների երգացանկը հասանելի կլինի նույն հաշվից։",
          feature3Title: "Push",
          feature3Text: "Թարմացումներն ու հայտարարությունները կգան հենց ծրագրի մեջ։",
          feature4Title: "Օֆֆլայն",
          feature4Text: "Ծրագիրը կաշխատի ավելի ամբողջական փորձով նաև օֆֆլայն։",
          socialReady: "Պատրաստ է գրանցման համար",
          socialDisabled: "Միացրու ադմինից, որպեսզի աշխատի"
        },
        setlists: {
          metaTitle: "Սեթլիստներ — Worship Platform",
          metaDescription: "Ստեղծիր, խմբագրիր և բացիր Worship Platform-ի սեթլիստները ծառայության, փորձի կամ խմբի աշխատանքի համար։",
          kicker: "Worship Setlists",
          title: "Սեթլիստների աշխատանքային տարածք",
          text: "Ստեղծիր ծառայության, փորձի կամ երիտասարդական հավաքի երգացանկ, պահիր կառուցվածքը և բացիր այն մեկ հպումով դիտման ռեժիմում։",
          totalSetlists: "Ընդհանուր սեթլիստներ",
          active: "Ակտիվ",
          public: "Հանրային",
          totalItems: "Ընդհանուր item-ներ",
          publicHint: "Բաց հասանելի հղումներով",
          totalItemsHint: "Երգեր և բաժիններ միասին",
          newSetlist: "Նոր սեթլիստ",
          newSetlistText: "Գրիր անունը և միանգամից անցիր կառուցելուն։",
          newSetlistPlaceholder: "Օր. Կիրակնօրյա ծառայություն",
          create: "Ստեղծել",
          searchFilter: "Որոնում և ֆիլտր",
          searchFilterText: "Արագ գտիր սեթլիստը անունով, նկարագրությամբ կամ կարգավիճակով։",
          searchPlaceholder: "Որոնել անունով կամ նկարագրությամբ",
          filterAll: "Բոլորը",
          filterActive: "Ակտիվ",
          filterArchived: "Արխիվ",
          filterPublic: "Հանրային",
          mySetlists: "Իմ սեթլիստները",
          latestFirst: "Վերջին թարմացվածներն առաջինն են",
          emptyState: "Ընտրիր setlist կամ ստեղծիր նորը",
          private: "Անձնական",
          open: "Բացել",
          share: "Բացել հասանելիությունը",
          copyLink: "Պատճենել հղումը",
          disableShare: "Փակել հասանելիությունը",
          archive: "Արխիվ",
          duplicate: "Կրկնօրինակել",
          delete: "Ջնջել",
          totalUnits: "Ընդհանուր միավոր",
          songs: "Երգեր",
          sections: "Բաժիններ",
          requiredSongs: "Պարտադիր երգեր",
          saveMeta: "Պահպանել տվյալները",
          addSong: "Ավելացնել երգ",
          songSearchPlaceholder: "Որոնել երգ անունով, կատարողով կամ tag-ով",
          targetKeyPlaceholder: "Թիրախային տոն (օր. G)",
          addSection: "Ավելացնել բաժին",
          sectionPlaceholder: "Օր. Փառաբանություն / Աղոթք / Խոսք",
          addSectionButton: "Ավելացնել բաժին",
          items: "Սեթլիստի item-ներ"
        },
        news: {
          metaTitle: "Նորություններ և թարմացումներ — Worship Platform",
          metaDescription: "Կարդա Worship Platform-ի նորությունները, թարմացումները և հայտարարությունները։",
          title: "Նորություններ"
        },
        songView: {
          transpose: "Տրանսպոզիցիա"
        }
      },
      app: {
        meta: {
          landingTitle: "Worship ծրագիր",
          landingSubtitle: "Արագ մուտք երգերի գրադարան",
          songsTitle: "Երգերի գրադարան",
          songsSubtitle: "Որոնում, բառեր, ակորդներ և օֆֆլայն աշխատանք",
          favoritesTitle: "Պահպանված երգեր",
          favoritesSubtitle: "Արագ մուտք քո ընտրված երգերին",
          setlistsTitle: "Սեթլիստներ",
          setlistsSubtitle: "Ծառայության երգացանկ և աշխատանքային հերթականություն",
          accountTitle: "Իմ հաշիվը",
          accountSubtitle: "Կարգավորումներ, push և պրոֆիլ",
          authTitle: "Մուտք և հաշիվ",
          authSubtitle: "Ծրագրային մուտք, գրանցում և հաշվի վերականգնում",
          songTitle: "Երգի դիտում",
          songSubtitle: "Ակորդներ, transpose և պահպանում",
          newsTitle: "Նորություններ",
          newsSubtitle: "Վերջին հայտարարություններն ու թարմացումները",
          appTitle: "Worship ծրագիր",
          appSubtitle: "Արագ և հարմար worship աշխատանքային տարածք"
        },
        pagebar: {
          app: "Worship ծրագիր",
          library: "Առցանց գրադարան",
          online: "Առցանց",
          offline: "Օֆֆլայն"
        },
        home: {
          eyebrow: "Installed Worship App",
          title: "Երգերը, պահպանումը և սեթլիստները մեկ հոսքում",
          text: "Սա արդեն ծրագրի աշխատային տարբերակն է. արագ որոնիր երգերը, բացիր պահպանվածները, աշխատիր օֆֆլայն և կազմիր ծառայության սեթլիստները առանց կայքի ավելորդ navigation-ի։",
          openSongs: "Բացել երգերը",
          favorites: "Պահպանված",
          setlists: "Սեթլիստներ",
          settings: "Կարգավորումներ",
          offlineTitle: "Օֆֆլայն",
          offlineText: "Երգերը հասանելի են պահված գրադարանից",
          fastTitle: "Արագ",
          fastText: "Որոնումը և բացումը մեկ հիմնական workspace-ում",
          pushTitle: "Push",
          pushText: "Թարմացումներ և հայտարարություններ հենց ծրագրի մեջ",
          setlistTitle: "Setlist",
          setlistText: "Ծառայության երգացանկը միշտ հասանելի է"
        },
        dock: {
          songs: "Երգեր",
          favorites: "Պահպ.",
          setlists: "Ցանկեր",
          account: "Հաշիվ"
        },
        openApp: {
          app: "Worship ծրագիր",
          pageText: "Այս էջը կարող ես բացել Worship ծրագրի մեջ։",
          close: "Փակել",
          openInApp: "Բացել ծրագրում",
          installedKicker: "Ծրագիրը տեղադրված է",
          installedText: "Այս սարքում Worship ծրագիրը արդեն տեղադրված է։",
          iosInstalledNote: "iPhone-ի վրա բացիր այն ձեռքով գլխավոր էկրանից։",
          androidInstalledNote: "Android-ի վրա բացիր այն ձեռքով գլխավոր էկրանից կամ ծրագրերի ցանկից։",
          desktopInstalledNote: "Համակարգչի վրա բացիր այն ձեռքով տեղադրված ծրագրերի ցանկից։",
          howToOpen: "Ինչպես բացել",
          addKicker: "Ավելացրու ծրագիրը",
          iosAddText: "iPhone-ի վրա կարող ես Worship-ը ավելացնել որպես առանձին ծրագիր։",
          iosAddNote: "Safari-ում սեղմիր Share, հետո ընտրիր Add to Home Screen։ Եթե արդեն տեղադրված է, բացիր այն գլխավոր էկրանից։",
          howToAdd: "Ինչպես ավելացնել",
          openOrAddKicker: "Բացել կամ ավելացնել",
          openOrAddText: "Այս սարքում կարող ես բացել կամ ավելացնել Worship ծրագիրը։",
          androidPromptNote: "Սեղմիր ներքևի կոճակը, որպեսզի բրաուզերը ցույց տա ծրագրի ավելացման պատուհանը։",
          desktopPromptNote: "Սեղմիր ներքևի կոճակը, եթե բրաուզերը թույլ է տալիս ավելացնել ծրագիրը։",
          probablyInstalledText: "Worship ծրագիրը այս սարքում հավանաբար տեղադրված է։",
          androidManualNote: "Բացիր այն ձեռքով գլխավոր էկրանից կամ ծրագրերի ցանկից։",
          desktopManualNote: "Բացիր այն ձեռքով տեղադրված ծրագրերի ցանկից։"
        }
      }
    },
    ru: {
      langLabel: "Рус",
      common: {
        home: "ГЛАВНАЯ",
        songs: "ПЕСНИ",
        favorites: "СОХРАНЕННЫЕ",
        news: "НОВОСТИ",
        setlists: "СЕТЛИСТЫ",
        account: "Аккаунт",
        login: "Войти",
        register: "Регистрация",
        logout: "Выйти",
        theme: "Тема",
        language: "Язык"
      },
      pages: {
        index: {
          metaTitle: "Worship Platform — христианские песни прославления, аккорды и сетлисты",
          metaDescription: "Находи христианские песни прославления, аккорды, слова и сетлисты в Worship Platform. Используй в сайте или приложении.",
          heroText: "Песни • Аккорды • Служение<br>создано для worship-команд",
          cta: "Начать Worship",
          purposeTitle: "Цель платформы",
          purpose1Title: "Для worship-служения",
          purpose1Text: "Создано на основе реального опыта worship-служений и команд",
          purpose2Title: "Песни и аккорды",
          purpose2Text: "На отдельной странице с чистой и удобной подачей",
          purpose3Title: "Быстро и просто",
          purpose3Text: "Без лишней сложности, удобно именно для worship",
          featuresTitle: "Что можно делать на сайте",
          features1Title: "Видеть аккорды",
          features1Text: "В удобной раскладке для инструментов",
          features2Title: "Читать слова",
          features2Text: "Крупный и понятный текст для использования во время служения",
          features3Title: "Транспозиция",
          features3Text: "Можно менять тональность. Удобно для певцов и инструментов",
          chooseTitle: "Почему выбрать этот сайт",
          choose1Title: "Понятные аккорды",
          choose1Text: "Удобно для всех инструментов и всей группы",
          choose2Title: "Современный UX",
          choose2Text: "Удобное использование с любого устройства",
          choose3Title: "Для служения",
          choose3Text: "Создано под реальные нужды worship-команд",
          story1Title: "От сцены к служению",
          story1Text: "Платформа создана из реального worship-опыта, чтобы музыкант был сосредоточен не на технике, а на Божьем присутствии.",
          story2Title: "Песня в твоих руках",
          story2Text: "Слова, аккорды и свобода в любой тональности.",
          footerBrand: "Песни • Аккорды • Служение<br>создано для worship-команд",
          footerSections: "Разделы",
          footerFeatures: "ВОЗМОЖНОСТИ",
          footerContact: "КОНТАКТ",
          footerFollow: "Следите за нами",
          updateTitle: "🚀 Новая версия сайта",
          updateText: "Сайт обновился. Пожалуйста, обновите страницу, чтобы увидеть новые возможности.",
          updateButton: "Обновить"
        },
        main: {
          metaTitle: "Песни — Worship Platform | христианские песни, аккорды и слова",
          metaDescription: "Открой библиотеку песен Worship Platform, найди христианские песни, аккорды и слова и выбери нужную тональность.",
          headerTitle: "Библиотека песен",
          headerText: "Ищи, открывай и используй песни во время worship-служения",
          searchPlaceholder: "Искать по названию, автору или тегу",
          tableTitle: "Список песен",
          columnName: "Название",
          columnKey: "Тональность",
          columnTag: "Тег",
          columnAction: "Действие",
          modeMeta: "Название+тег",
          modeLyrics: "Слова",
          modeTitle: "Изменить режим поиска"
        },
        favorites: {
          metaTitle: "Сохранённые песни — Worship Platform",
          metaDescription: "Открой свои сохранённые песни Worship Platform, недавно просмотренные и возможность экспорта в PDF.",
          headerTitle: "Список сохранённых песен",
          headerText: "Favorites • Аккорды • Служение",
          searchPlaceholder: "Искать сохранённую песню — напр. Наш Святой Бог",
          exportPdf: "📄 Экспорт PDF",
          guestTitle: "Сохранённые песни доступны только после входа",
          guestText: "Чтобы сохранять песни, видеть список сохранённых, делать экспорт PDF и использовать setlist, сначала войди в систему.",
          guestLogin: "Войти",
          guestRegister: "Регистрация",
          mySongs: "Мои песни",
          recentSongs: "Недавно просмотренные песни",
          clear: "Очистить",
          footerBrand: "Песни • Аккорды • Служение<br>создано для worship-команд",
          footerSections: "Разделы",
          footerFeatures: "ВОЗМОЖНОСТИ",
          footerContact: "КОНТАКТ",
          footerFollow: "Следите за нами",
          updateTitle: "🚀 Новая версия сайта",
          updateText: "Сайт обновился. Пожалуйста, обновите страницу, чтобы увидеть новые возможности.",
          updateButton: "Обновить"
        },
        account: {
          metaTitle: "Аккаунт — Worship Platform",
          metaDescription: "Управляй аккаунтом Worship Platform, безопасностью, push-уведомлениями и активными сессиями.",
          title: "Аккаунт",
          subtitle: "Настрой имя, почту и пароль.",
          quickLogout: "Выйти",
          profile: "Профиль",
          name: "Имя",
          namePlaceholder: "Твоё имя",
          email: "Эл. почта",
          emailHint: "Чтобы изменить email, используй раздел «Подтверждение почты» ниже.",
          save: "Сохранить",
          refresh: "Обновить",
          security: "Безопасность",
          currentPassword: "Текущий пароль",
          newPassword: "Новый пароль (мин. 8 символов)",
          changePassword: "Изменить пароль",
          forgotPassword: "Забыл пароль",
          emailVerify: "Подтверждение эл. почты",
          emailVerifyText: "Подтверждённая почта нужна для «Forgot password» и безопасности.",
          emailSavePlaceholder: "name@example.com",
          emailSaveHint: "Если изменишь почту, её нужно будет подтвердить заново.",
          sendVerify: "Отправить письмо подтверждения",
          saveEmail: "Сохранить эл. почту",
          push: "Push-уведомления",
          pushText: "Push-уведомления доступны только для установленного приложения, а не для обычной версии сайта в браузере.",
          enablePush: "Включить уведомления",
          disablePush: "Выключить уведомления",
          sessions: "Активные сессии",
          sessionsText: "Здесь ты увидишь устройства, где открыт твой аккаунт.",
          currentDevice: "Это устройство будет отмечено как «Текущее устройство».",
          currentDeviceHint: "Сессии можно закрывать по одной или все остальные сразу.",
          closeOtherSessions: "Закрыть другие сессии",
          dangerZone: "Опасное действие",
          dangerText: "Удаление аккаунта необратимо. Будут потеряны сохранённые песни и данные.",
          deleteAccount: "Удалить аккаунт",
          confirm: "Подтверждение",
          confirmText: "Это удалит твой аккаунт и данные. Чтобы продолжить, введи пароль.",
          cancel: "Отмена",
          deleteForever: "Удалить навсегда"
        },
        login: {
          title: "Вход",
          loginPlaceholder: "Логин или эл. почта",
          passwordPlaceholder: "Пароль",
          rememberMe: "Запомнить меня",
          noAccount: "Нет аккаунта?",
          submit: "Войти",
          continueWith: "или продолжить через",
          forgotPassword: "Забыли имя или пароль?",
          backHome: "← Назад на главную",
          feature1Title: "Сохранённые песни",
          feature1Text: "Твои выбранные песни всегда будут связаны с аккаунтом.",
          feature2Title: "Сетлисты",
          feature2Text: "Песенный список служения будет доступен с этого же аккаунта.",
          feature3Title: "Push",
          feature3Text: "Обновления приложения и объявления приходят прямо внутрь.",
          feature4Title: "Оффлайн",
          feature4Text: "После входа опыт использования приложения становится более полным и удобным.",
          socialReady: "Готово для входа",
          socialDisabled: "Включи в админке, чтобы работало"
        },
        register: {
          title: "Регистрация",
          namePlaceholder: "Имя",
          loginPlaceholder: "Логин или эл. почта",
          emailPlaceholder: "Эл. почта",
          passwordPrefix: "Пароль (>=",
          passwordSuffix: " символов)",
          submit: "Зарегистрироваться",
          hasAccount: "Уже есть аккаунт?",
          continueWith: "или продолжить через",
          backHome: "← Назад на главную",
          feature1Title: "Сохранённые песни",
          feature1Text: "Любимые песни будут сохранены в твоём аккаунте.",
          feature2Title: "Сетлисты",
          feature2Text: "Списки песен для служений будут доступны из того же аккаунта.",
          feature3Title: "Push",
          feature3Text: "Обновления и объявления будут приходить прямо в приложение.",
          feature4Title: "Оффлайн",
          feature4Text: "Приложение будет работать более полноценно даже оффлайн.",
          socialReady: "Готово для регистрации",
          socialDisabled: "Включи в админке, чтобы работало"
        },
        setlists: {
          metaTitle: "Сетлисты — Worship Platform",
          metaDescription: "Создавай, редактируй и открывай сетлисты Worship Platform для служения, репетиции или командной работы.",
          kicker: "Worship Setlists",
          title: "Рабочее пространство сетлистов",
          text: "Создавай список песен для служения, репетиции или молодёжной встречи, сохраняй структуру и открывай его в режиме просмотра одним касанием.",
          totalSetlists: "Всего сетлистов",
          active: "Активные",
          public: "Публичные",
          totalItems: "Всего элементов",
          publicHint: "С открытыми ссылками доступа",
          totalItemsHint: "Песни и разделы вместе",
          newSetlist: "Новый сетлист",
          newSetlistText: "Напиши название и сразу переходи к построению.",
          newSetlistPlaceholder: "Напр. Воскресное служение",
          create: "Создать",
          searchFilter: "Поиск и фильтр",
          searchFilterText: "Быстро находи сетлист по названию, описанию или статусу.",
          searchPlaceholder: "Искать по названию или описанию",
          filterAll: "Все",
          filterActive: "Активные",
          filterArchived: "Архив",
          filterPublic: "Публичные",
          mySetlists: "Мои сетлисты",
          latestFirst: "Сначала последние обновлённые",
          emptyState: "Выбери сетлист или создай новый",
          private: "Личный",
          open: "Открыть",
          share: "Открыть доступ",
          copyLink: "Копировать ссылку",
          disableShare: "Закрыть доступ",
          archive: "Архив",
          duplicate: "Дублировать",
          delete: "Удалить",
          totalUnits: "Всего единиц",
          songs: "Песни",
          sections: "Разделы",
          requiredSongs: "Обязательные песни",
          saveMeta: "Сохранить данные",
          addSong: "Добавить песню",
          songSearchPlaceholder: "Искать песню по названию, исполнителю или тегу",
          targetKeyPlaceholder: "Целевая тональность (напр. G)",
          addSection: "Добавить раздел",
          sectionPlaceholder: "Напр. Прославление / Молитва / Слово",
          addSectionButton: "Добавить раздел",
          items: "Элементы сетлиста"
        },
        news: {
          metaTitle: "Новости и обновления — Worship Platform",
          metaDescription: "Читайте новости, обновления и объявления Worship Platform.",
          title: "Новости"
        },
        songView: {
          transpose: "Транспозиция"
        }
      },
      app: {
        meta: {
          landingTitle: "Приложение Worship",
          landingSubtitle: "Быстрый вход в библиотеку песен",
          songsTitle: "Библиотека песен",
          songsSubtitle: "Поиск, слова, аккорды и оффлайн-работа",
          favoritesTitle: "Сохранённые песни",
          favoritesSubtitle: "Быстрый доступ к выбранным песням",
          setlistsTitle: "Сетлисты",
          setlistsSubtitle: "Песенный порядок служения и рабочая последовательность",
          accountTitle: "Мой аккаунт",
          accountSubtitle: "Настройки, push и профиль",
          authTitle: "Вход и аккаунт",
          authSubtitle: "Вход в приложении, регистрация и восстановление аккаунта",
          songTitle: "Просмотр песни",
          songSubtitle: "Аккорды, транспозиция и сохранение",
          newsTitle: "Новости",
          newsSubtitle: "Последние объявления и обновления",
          appTitle: "Приложение Worship",
          appSubtitle: "Быстрое и удобное рабочее пространство для worship"
        },
        pagebar: {
          app: "Приложение Worship",
          library: "Онлайн-библиотека",
          online: "Онлайн",
          offline: "Оффлайн"
        },
        home: {
          eyebrow: "Installed Worship App",
          title: "Песни, сохранение и сетлисты в одном потоке",
          text: "Это уже рабочая версия приложения: быстро ищи песни, открывай сохранённые, работай оффлайн и составляй сетлисты без лишней навигации сайта.",
          openSongs: "Открыть песни",
          favorites: "Сохранённые",
          setlists: "Сетлисты",
          settings: "Настройки",
          offlineTitle: "Оффлайн",
          offlineText: "Песни доступны из сохранённой библиотеки",
          fastTitle: "Быстро",
          fastText: "Поиск и открытие в одном основном рабочем пространстве",
          pushTitle: "Push",
          pushText: "Обновления и объявления прямо внутри приложения",
          setlistTitle: "Setlist",
          setlistText: "Песенный порядок служения всегда под рукой"
        },
        dock: {
          songs: "Песни",
          favorites: "Сохр.",
          setlists: "Списки",
          account: "Аккаунт"
        },
        openApp: {
          app: "Приложение Worship",
          pageText: "Эту страницу можно открыть в приложении Worship.",
          close: "Закрыть",
          openInApp: "Открыть в приложении",
          installedKicker: "Приложение установлено",
          installedText: "На этом устройстве приложение Worship уже установлено.",
          iosInstalledNote: "На iPhone открой его вручную с главного экрана.",
          androidInstalledNote: "На Android открой его вручную с главного экрана или из списка приложений.",
          desktopInstalledNote: "На компьютере открой его вручную из списка установленных приложений.",
          howToOpen: "Как открыть",
          addKicker: "Добавь приложение",
          iosAddText: "На iPhone можно добавить Worship как отдельное приложение.",
          iosAddNote: "В Safari нажми Share, затем выбери Add to Home Screen. Если уже установлено, открой с главного экрана.",
          howToAdd: "Как добавить",
          openOrAddKicker: "Открыть или добавить",
          openOrAddText: "На этом устройстве можно открыть или добавить приложение Worship.",
          androidPromptNote: "Нажми кнопку ниже, чтобы браузер показал окно установки приложения.",
          desktopPromptNote: "Нажми кнопку ниже, если браузер разрешает добавить приложение.",
          probablyInstalledText: "Вероятно, приложение Worship уже установлено на этом устройстве.",
          androidManualNote: "Открой его вручную с главного экрана или из списка приложений.",
          desktopManualNote: "Открой его вручную из списка установленных приложений."
        }
      }
    },
    en: {
      langLabel: "Eng",
      common: {
        home: "HOME",
        songs: "SONGS",
        favorites: "SAVED SONGS",
        news: "NEWS",
        setlists: "SETLISTS",
        account: "Account",
        login: "Login",
        register: "Register",
        logout: "Logout",
        theme: "Theme",
        language: "Language"
      },
      pages: {
        index: {
          metaTitle: "Worship Platform — Christian worship songs, chords and setlists",
          metaDescription: "Find Christian worship songs, chords, lyrics and setlists in Worship Platform. Use it on the web or in the app.",
          heroText: "Songs • Chords • Ministry<br>built for worship teams",
          cta: "Start Worship",
          purposeTitle: "Purpose of the platform",
          purpose1Title: "Built for worship",
          purpose1Text: "Created from real worship service and team experience",
          purpose2Title: "Songs and chords",
          purpose2Text: "On a dedicated page with a clean and convenient presentation",
          purpose3Title: "Fast and simple",
          purpose3Text: "No unnecessary complexity, convenient for worship",
          featuresTitle: "What you can do on the site",
          features1Title: "See chords",
          features1Text: "In a layout convenient for instruments",
          features2Title: "Read lyrics",
          features2Text: "Large, clear text for use during ministry",
          features3Title: "Transpose",
          features3Text: "You can change the key. Helpful for singers and instruments",
          chooseTitle: "Why choose this site",
          choose1Title: "Clear chords",
          choose1Text: "Comfortable for all instruments and the full band",
          choose2Title: "Modern UX",
          choose2Text: "Easy to use from any device",
          choose3Title: "Made for ministry",
          choose3Text: "Created for the real needs of worship teams",
          story1Title: "From stage to ministry",
          story1Text: "Built from real worship stage experience so musicians can focus not on technology, but on the presence of God.",
          story2Title: "The song in your hands",
          story2Text: "Lyrics, chords and freedom in any key.",
          footerBrand: "Songs • Chords • Ministry<br>built for worship teams",
          footerSections: "Sections",
          footerFeatures: "FEATURES",
          footerContact: "CONTACT",
          footerFollow: "Follow us",
          updateTitle: "🚀 New site version",
          updateText: "The site has been updated. Please refresh the page to see the new features.",
          updateButton: "Refresh"
        },
        main: {
          metaTitle: "Songs — Worship Platform | Christian songs, chords and lyrics",
          metaDescription: "Open the Worship Platform song library, find Christian songs, chords and lyrics, and choose the key you need.",
          headerTitle: "Song library",
          headerText: "Search, open and use songs during worship ministry",
          searchPlaceholder: "Search by title, author or tag",
          tableTitle: "Song list",
          columnName: "Name",
          columnKey: "Key",
          columnTag: "Tag",
          columnAction: "Action",
          modeMeta: "Title+tag",
          modeLyrics: "Lyrics",
          modeTitle: "Change search mode"
        },
        favorites: {
          metaTitle: "Saved songs — Worship Platform",
          metaDescription: "Open your saved Worship Platform songs, recently viewed songs and PDF export tools.",
          headerTitle: "Saved songs list",
          headerText: "Favorites • Chords • Ministry",
          searchPlaceholder: "Search saved song — e.g. Our Holy God",
          exportPdf: "📄 PDF Export",
          guestTitle: "Saved songs are available only after login",
          guestText: "To save songs, see your saved list, export PDF and use setlists, you need to log in first.",
          guestLogin: "Log in",
          guestRegister: "Register",
          mySongs: "My songs",
          recentSongs: "Recently viewed songs",
          clear: "Clear",
          footerBrand: "Songs • Chords • Ministry<br>built for worship teams",
          footerSections: "Sections",
          footerFeatures: "FEATURES",
          footerContact: "CONTACT",
          footerFollow: "Follow us",
          updateTitle: "🚀 New site version",
          updateText: "The site has been updated. Please refresh the page to see the new features.",
          updateButton: "Refresh"
        },
        account: {
          metaTitle: "Account — Worship Platform",
          metaDescription: "Manage your Worship Platform account, security, push notifications and active sessions.",
          title: "Account",
          subtitle: "Manage your name, email and password.",
          quickLogout: "Log out",
          profile: "Profile",
          name: "Name",
          namePlaceholder: "Your name",
          email: "Email",
          emailHint: "To change your email, use the “Email verification” section below.",
          save: "Save",
          refresh: "Refresh",
          security: "Security",
          currentPassword: "Current password",
          newPassword: "New password (min. 8 characters)",
          changePassword: "Change password",
          forgotPassword: "Forgot password",
          emailVerify: "Email verification",
          emailVerifyText: "A verified email is required for “Forgot password” and security.",
          emailSavePlaceholder: "name@example.com",
          emailSaveHint: "If you change the email, it will need to be verified again.",
          sendVerify: "Send verification email",
          saveEmail: "Save email",
          push: "Push notifications",
          pushText: "Push notifications are available only for the installed app, not for the regular browser version of the site.",
          enablePush: "Enable notifications",
          disablePush: "Disable notifications",
          sessions: "Active sessions",
          sessionsText: "Here you can see the devices where your account is currently open.",
          currentDevice: "This device will be marked as the “Current device”.",
          currentDeviceHint: "You can close sessions one by one or close all the others at once.",
          closeOtherSessions: "Close other sessions",
          dangerZone: "Danger zone",
          dangerText: "Deleting the account is irreversible. Saved songs and data will be lost.",
          deleteAccount: "Delete account",
          confirm: "Confirmation",
          confirmText: "This will delete your account and data. Enter your password to continue.",
          cancel: "Cancel",
          deleteForever: "Delete permanently"
        },
        login: {
          title: "Login",
          loginPlaceholder: "Username or email",
          passwordPlaceholder: "Password",
          rememberMe: "Remember me",
          noAccount: "No account yet?",
          submit: "Login",
          continueWith: "or continue with",
          forgotPassword: "Forgot username or password?",
          backHome: "← Back to home",
          feature1Title: "Saved songs",
          feature1Text: "Your selected songs are always connected to your account.",
          feature2Title: "Setlists",
          feature2Text: "Your ministry song order stays available from the same account.",
          feature3Title: "Push",
          feature3Text: "App updates and announcements arrive right inside the app.",
          feature4Title: "Offline",
          feature4Text: "After login, the app experience becomes fuller and more convenient.",
          socialReady: "Ready for sign-in",
          socialDisabled: "Enable it from admin to make it work"
        },
        register: {
          title: "Register",
          namePlaceholder: "Name",
          loginPlaceholder: "Username or email",
          emailPlaceholder: "Email",
          passwordPrefix: "Password (>=",
          passwordSuffix: " chars)",
          submit: "Register",
          hasAccount: "Already have an account?",
          continueWith: "or continue with",
          backHome: "← Back to home",
          feature1Title: "Saved songs",
          feature1Text: "Your favorite songs will be stored in your account.",
          feature2Title: "Setlists",
          feature2Text: "Ministry song lists will stay available from the same account.",
          feature3Title: "Push",
          feature3Text: "Updates and announcements will arrive right inside the app.",
          feature4Title: "Offline",
          feature4Text: "The app will keep a fuller experience even offline.",
          socialReady: "Ready for sign-up",
          socialDisabled: "Enable it from admin to make it work"
        },
        setlists: {
          metaTitle: "Setlists — Worship Platform",
          metaDescription: "Create, edit and open Worship Platform setlists for services, rehearsals and team workflow.",
          kicker: "Worship Setlists",
          title: "Setlist workspace",
          text: "Create a song order for a service, rehearsal or youth gathering, keep the structure and open it in view mode with one tap.",
          totalSetlists: "Total setlists",
          active: "Active",
          public: "Public",
          totalItems: "Total items",
          publicHint: "With open share links",
          totalItemsHint: "Songs and sections together",
          newSetlist: "New setlist",
          newSetlistText: "Enter a name and start building right away.",
          newSetlistPlaceholder: "e.g. Sunday service",
          create: "Create",
          searchFilter: "Search and filter",
          searchFilterText: "Quickly find a setlist by name, description or status.",
          searchPlaceholder: "Search by name or description",
          filterAll: "All",
          filterActive: "Active",
          filterArchived: "Archived",
          filterPublic: "Public",
          mySetlists: "My setlists",
          latestFirst: "Most recently updated first",
          emptyState: "Choose a setlist or create a new one",
          private: "Private",
          open: "Open",
          share: "Enable sharing",
          copyLink: "Copy link",
          disableShare: "Disable sharing",
          archive: "Archive",
          duplicate: "Duplicate",
          delete: "Delete",
          totalUnits: "Total items",
          songs: "Songs",
          sections: "Sections",
          requiredSongs: "Required songs",
          saveMeta: "Save details",
          addSong: "Add song",
          songSearchPlaceholder: "Search by song title, artist or tag",
          targetKeyPlaceholder: "Target key (e.g. G)",
          addSection: "Add section",
          sectionPlaceholder: "e.g. Worship / Prayer / Message",
          addSectionButton: "Add section",
          items: "Setlist items"
        },
        news: {
          metaTitle: "News and updates — Worship Platform",
          metaDescription: "Read Worship Platform news, updates and announcements.",
          title: "News"
        },
        songView: {
          transpose: "Transpose"
        }
      },
      app: {
        meta: {
          landingTitle: "Worship app",
          landingSubtitle: "Fast access to the song library",
          songsTitle: "Song library",
          songsSubtitle: "Search, lyrics, chords and offline work",
          favoritesTitle: "Saved songs",
          favoritesSubtitle: "Fast access to your selected songs",
          setlistsTitle: "Setlists",
          setlistsSubtitle: "Service song order and working sequence",
          accountTitle: "My account",
          accountSubtitle: "Settings, push and profile",
          authTitle: "Login and account",
          authSubtitle: "App login, registration and account recovery",
          songTitle: "Song view",
          songSubtitle: "Chords, transpose and saving",
          newsTitle: "News",
          newsSubtitle: "Latest announcements and updates",
          appTitle: "Worship app",
          appSubtitle: "A fast and convenient worship workspace"
        },
        pagebar: {
          app: "Worship app",
          library: "Online library",
          online: "Online",
          offline: "Offline"
        },
        home: {
          eyebrow: "Installed Worship App",
          title: "Songs, saved items and setlists in one flow",
          text: "This is already the app workspace: quickly search songs, open saved items, work offline and build service setlists without the extra site navigation.",
          openSongs: "Open songs",
          favorites: "Saved",
          setlists: "Setlists",
          settings: "Settings",
          offlineTitle: "Offline",
          offlineText: "Songs stay available from the saved library",
          fastTitle: "Fast",
          fastText: "Search and opening inside one main workspace",
          pushTitle: "Push",
          pushText: "Updates and announcements right inside the app",
          setlistTitle: "Setlist",
          setlistText: "The service song order is always available"
        },
        dock: {
          songs: "Songs",
          favorites: "Saved",
          setlists: "Lists",
          account: "Account"
        },
        openApp: {
          app: "Worship app",
          pageText: "You can open this page in the Worship app.",
          close: "Close",
          openInApp: "Open in app",
          installedKicker: "App is installed",
          installedText: "The Worship app is already installed on this device.",
          iosInstalledNote: "On iPhone, open it manually from the home screen.",
          androidInstalledNote: "On Android, open it manually from the home screen or app list.",
          desktopInstalledNote: "On desktop, open it manually from the installed apps list.",
          howToOpen: "How to open",
          addKicker: "Add the app",
          iosAddText: "On iPhone, you can add Worship as a standalone app.",
          iosAddNote: "In Safari, tap Share, then choose Add to Home Screen. If it is already installed, open it from the home screen.",
          howToAdd: "How to add",
          openOrAddKicker: "Open or add",
          openOrAddText: "You can open or add the Worship app on this device.",
          androidPromptNote: "Tap the button below so the browser can show the install prompt.",
          desktopPromptNote: "Tap the button below if the browser allows adding the app.",
          probablyInstalledText: "The Worship app is probably already installed on this device.",
          androidManualNote: "Open it manually from the home screen or app list.",
          desktopManualNote: "Open it manually from the installed apps list."
        }
      }
    }
  };

  function deepGet(obj, path) {
    var parts = String(path || "").split(".");
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!current || typeof current !== "object" || !(parts[i] in current)) {
        return undefined;
      }
      current = current[parts[i]];
    }
    return current;
  }

  function parseQueryLang() {
    try {
      var url = new URL(window.location.href);
      var value = String(url.searchParams.get(QUERY_KEY) || "").toLowerCase();
      return SUPPORTED.indexOf(value) >= 0 ? value : "";
    } catch (err) {
      return "";
    }
  }

  function detectBrowserLang() {
    return "hy";
  }

  function getStoredLang() {
    try {
      var value = String(localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
      return SUPPORTED.indexOf(value) >= 0 ? value : "";
    } catch (err) {
      return "";
    }
  }

  function getLang() {
    var queryLang = parseQueryLang();
    if (queryLang) return queryLang;
    var stored = getStoredLang();
    if (stored) return stored;
    return "hy";
  }

  function setLang(lang, options) {
    options = options || {};
    lang = SUPPORTED.indexOf(lang) >= 0 ? lang : "hy";
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {}

    if (options.reload === false) {
      applyTranslations(lang);
      return;
    }
    window.location.reload();
  }

  function t(path, fallback) {
    var lang = getLang();
    var value = deepGet(dict[lang], path);
    if (typeof value === "string") return value;
    var hyValue = deepGet(dict.hy, path);
    if (typeof hyValue === "string") return hyValue;
    return fallback || path;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function setHTML(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.innerHTML = value;
    });
  }

  function setPlaceholder(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.setAttribute("placeholder", value);
    });
  }

  function setAttr(selector, attr, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.setAttribute(attr, value);
    });
  }

  function setMixedLabel(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      var btnText = el.querySelector(".btn-text");
      if (btnText) {
        btnText.textContent = value;
        return;
      }
      for (var i = el.childNodes.length - 1; i >= 0; i--) {
        var node = el.childNodes[i];
        if (node && node.nodeType === 3) {
          node.textContent = " " + value;
          return;
        }
      }
      el.appendChild(document.createTextNode(" " + value));
    });
  }

  function ensureStyles() {
    if (document.getElementById("wpI18nStyles")) return;
    var style = document.createElement("style");
    style.id = "wpI18nStyles";
    style.textContent =
      ".wp-lang-switcher{display:inline-flex;align-items:center;gap:6px;margin-left:18px;padding:6px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04)}" +
      ".wp-lang-switcher button{border:0;background:transparent;color:#fff;padding:7px 10px;border-radius:999px;font:700 11px/1 Inter,system-ui,sans-serif;cursor:pointer;opacity:.74}" +
      ".wp-lang-switcher button.is-active{background:rgba(255,255,255,.12);opacity:1}" +
      "body.wp-main-app #wpAppPagebar .wp-lang-switcher{margin-left:auto;padding:5px 6px;border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.05)}" +
      "body.wp-main-app #wpAppPagebar .wp-lang-switcher button{padding:7px 8px;font-size:10px}" +
      ".wp-lang-floating{position:fixed;top:14px;right:14px;z-index:100002;display:inline-flex;align-items:center;gap:6px;padding:6px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(10,15,27,.88);backdrop-filter:blur(14px)}" +
      ".wp-lang-floating button{border:0;background:transparent;color:#fff;padding:7px 10px;border-radius:999px;font:700 11px/1 Inter,system-ui,sans-serif;cursor:pointer;opacity:.74}" +
      ".wp-lang-floating button.is-active{background:rgba(255,255,255,.12);opacity:1}";
    document.head.appendChild(style);
  }

  function buildSwitcherMarkup(lang) {
    return SUPPORTED.map(function (code) {
      var label = deepGet(dict[code], "langLabel") || code.toUpperCase();
      return '<button type="button" data-lang="' + code + '"' + (code === lang ? ' class="is-active"' : "") + ">" + label + "</button>";
    }).join("");
  }

  function injectSwitcher(lang) {
    ensureStyles();
    var target = document.querySelector("#wpAppPagebar .wp-app-pagebar-side") || document.querySelector("nav .menu");
    var existing = document.getElementById("wpLangSwitcher");
    if (!existing) {
      var wrap = document.createElement("div");
      wrap.id = "wpLangSwitcher";
      wrap.className = target ? "wp-lang-switcher" : "wp-lang-floating";
      wrap.setAttribute("aria-label", t("common.language"));
      wrap.innerHTML = buildSwitcherMarkup(lang);
      if (target) {
        target.appendChild(wrap);
      } else {
        document.body.appendChild(wrap);
      }
      wrap.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-lang]");
        if (!button) return;
        setLang(String(button.getAttribute("data-lang") || "hy"));
      });
    } else {
      if (target && existing.parentNode !== target) {
        target.appendChild(existing);
      }
      existing.className = target ? "wp-lang-switcher" : "wp-lang-floating";
      existing.innerHTML = buildSwitcherMarkup(lang);
    }
  }

  function wrapFetchWithLang() {
    if (window.__wpI18nFetchWrapped || typeof window.fetch !== "function") return;
    window.__wpI18nFetchWrapped = true;

    var originalFetch = window.fetch.bind(window);

    function shouldAttachLang(url) {
      try {
        var parsed = new URL(url, window.location.href);
        if (parsed.origin !== window.location.origin) return false;
        var path = parsed.pathname.toLowerCase();
        return path === "/api.php" ||
          path === "/favorites_api.php" ||
          path === "/setlists_api.php" ||
          path === "/account_api.php";
      } catch (err) {
        return false;
      }
    }

    function withLang(url, lang) {
      try {
        var parsed = new URL(url, window.location.href);
        parsed.searchParams.set("lang", lang);
        return parsed.toString();
      } catch (err) {
        return url;
      }
    }

    window.fetch = function (input, init) {
      try {
        var lang = getLang();
        if (lang && lang !== "hy") {
          if (typeof input === "string" || input instanceof URL) {
            var nextUrl = withLang(String(input), lang);
            if (shouldAttachLang(nextUrl)) {
              input = nextUrl;
            }
          } else if (input && typeof Request !== "undefined" && input instanceof Request) {
            var requestUrl = withLang(input.url, lang);
            if (shouldAttachLang(requestUrl)) {
              input = new Request(requestUrl, input);
            }
          }
        }
      } catch (err) {
        // ignore fetch wrapping issues
      }

      return originalFetch(input, init);
    };
  }

  function updateMeta(title, description) {
    if (title) document.title = title;
    if (description) {
      setAttr('meta[name="description"]', "content", description);
      setAttr('meta[property="og:description"]', "content", description);
    }
    if (title) {
      setAttr('meta[property="og:title"]', "content", title);
    }
  }

  function applyCommonNav() {
    setText('nav .menu a[href="/"]', t("common.home"));
    setText('nav .menu a[href="/main.html"]', t("common.songs"));
    setText('nav .menu a[href="/favorites.html"]', t("common.favorites"));
    setText('nav .menu a[href="/news.html"]', t("common.news"));
    setMixedLabel("#loginBtn", t("common.login"));
    setMixedLabel("#registerBtn", t("common.register"));
    setText(".user-sub", t("common.account"));
    setAttr('a[href="/account.html"].icon-btn', "title", t("common.account"));
    setAttr('a[href="/account.html"].icon-btn', "aria-label", t("common.account"));
    setAttr("#logoutBtn", "title", t("common.logout"));
    setAttr("#logoutBtn", "aria-label", t("common.logout"));
  }

  function applyIndex() {
    updateMeta(t("pages.index.metaTitle"), t("pages.index.metaDescription"));
    setHTML("header .hero p", t("pages.index.heroText"));
    setText(".cta a[href=\"/main.html\"]", t("pages.index.cta"));
    setText("section.section:nth-of-type(1) h2", t("pages.index.purposeTitle"));
    setText("section.section:nth-of-type(1) .card:nth-child(1) h3", t("pages.index.purpose1Title"));
    setText("section.section:nth-of-type(1) .card:nth-child(1) p", t("pages.index.purpose1Text"));
    setText("section.section:nth-of-type(1) .card:nth-child(2) h3", t("pages.index.purpose2Title"));
    setText("section.section:nth-of-type(1) .card:nth-child(2) p", t("pages.index.purpose2Text"));
    setText("section.section:nth-of-type(1) .card:nth-child(3) h3", t("pages.index.purpose3Title"));
    setText("section.section:nth-of-type(1) .card:nth-child(3) p", t("pages.index.purpose3Text"));
    setText("section.section:nth-of-type(2) h2", t("pages.index.featuresTitle"));
    setText("section.section:nth-of-type(2) .card:nth-child(1) h3", t("pages.index.features1Title"));
    setText("section.section:nth-of-type(2) .card:nth-child(1) p", t("pages.index.features1Text"));
    setText("section.section:nth-of-type(2) .card:nth-child(2) h3", t("pages.index.features2Title"));
    setText("section.section:nth-of-type(2) .card:nth-child(2) p", t("pages.index.features2Text"));
    setText("section.section:nth-of-type(2) .card:nth-child(3) h3", t("pages.index.features3Title"));
    setText("section.section:nth-of-type(2) .card:nth-child(3) p", t("pages.index.features3Text"));
    setText("section.section:nth-of-type(3) h2", t("pages.index.chooseTitle"));
    setText("section.section:nth-of-type(3) .card:nth-child(1) h3", t("pages.index.choose1Title"));
    setText("section.section:nth-of-type(3) .card:nth-child(1) p", t("pages.index.choose1Text"));
    setText("section.section:nth-of-type(3) .card:nth-child(2) h3", t("pages.index.choose2Title"));
    setText("section.section:nth-of-type(3) .card:nth-child(2) p", t("pages.index.choose2Text"));
    setText("section.section:nth-of-type(3) .card:nth-child(3) h3", t("pages.index.choose3Title"));
    setText("section.section:nth-of-type(3) .card:nth-child(3) p", t("pages.index.choose3Text"));
    setText("section:not(.section):nth-of-type(4) .reveal h2", t("pages.index.story1Title"));
    setText("section:not(.section):nth-of-type(4) .reveal p", t("pages.index.story1Text"));
    setText("section:not(.section):nth-of-type(5) .reveal h2", t("pages.index.story2Title"));
    setText("section:not(.section):nth-of-type(5) .reveal p", t("pages.index.story2Text"));
    setHTML(".footer-brand p", t("pages.index.footerBrand"));
    setText(".footer-links:nth-of-type(1) h4", t("pages.index.footerSections"));
    setText('.footer-links:nth-of-type(1) a[href="/#features"]', t("pages.index.footerFeatures"));
    setText('.footer-links:nth-of-type(1) a[href="#features"]', t("pages.index.footerContact"));
    setText(".footer-links:nth-of-type(2) h4", t("pages.index.footerFollow"));
    setText("#updateModal .update-box h3", t("pages.index.updateTitle"));
    setText("#updateModal .update-box p", t("pages.index.updateText"));
    setText("#updateModal .update-box button", t("pages.index.updateButton"));
  }

  function applyMain() {
    updateMeta(t("pages.main.metaTitle"), t("pages.main.metaDescription"));
    setText(".brand h1", t("pages.main.headerTitle"));
    setText(".brand p", t("pages.main.headerText"));
    setPlaceholder(".search-input", t("pages.main.searchPlaceholder"));
    setText(".table-header h2", t("pages.main.tableTitle"));
    setText("#songsHeadName", t("pages.main.columnName"));
    setText("#songsHeadKey", t("pages.main.columnKey"));
    setText("#songsHeadTag", t("pages.main.columnTag"));
    setText("#songsHeadAction", t("pages.main.columnAction"));
    setText("#modeLabelMeta", t("pages.main.modeMeta"));
    setText("#modeLabelLyrics", t("pages.main.modeLyrics"));
    setAttr(".mode-switch", "title", t("pages.main.modeTitle"));
  }

  function applyFavorites() {
    updateMeta(t("pages.favorites.metaTitle"), t("pages.favorites.metaDescription"));
    setText(".brand h1", t("pages.favorites.headerTitle"));
    setText(".brand p", t("pages.favorites.headerText"));
    setPlaceholder("#searchBox", t("pages.favorites.searchPlaceholder"));
    setText("#exportPdfBtn", t("pages.favorites.exportPdf"));
    setText(".guest-card-title", t("pages.favorites.guestTitle"));
    setText(".guest-card-text", t("pages.favorites.guestText"));
    setText("#guestFavoritesLoginBtn", t("pages.favorites.guestLogin"));
    setText("#guestFavoritesRegisterBtn", t("pages.favorites.guestRegister"));
    setText("#favoritesTableCard .table-header h2", t("pages.favorites.mySongs"));
    setText(".recent-head h2", t("pages.favorites.recentSongs"));
    setText("#clearRecentBtn", t("pages.favorites.clear"));
    setHTML(".footer-brand p", t("pages.favorites.footerBrand"));
    setText(".footer-links:nth-of-type(1) h4", t("pages.favorites.footerSections"));
    setText('.footer-links:nth-of-type(1) a[href="/#features"]', t("pages.favorites.footerFeatures"));
    setText('.footer-links:nth-of-type(1) a[href="#features"]', t("pages.favorites.footerContact"));
    setText(".footer-links:nth-of-type(2) h4", t("pages.favorites.footerFollow"));
    setText("#updateModal .update-box h3", t("pages.favorites.updateTitle"));
    setText("#updateModal .update-box p", t("pages.favorites.updateText"));
    setText("#updateModal .update-box button", t("pages.favorites.updateButton"));
  }

  function applyAccount() {
    updateMeta(t("pages.account.metaTitle"), t("pages.account.metaDescription"));
    setText(".account-head-copy h1", t("pages.account.title"));
    setText(".account-head-copy .sub", t("pages.account.subtitle"));
    setMixedLabel("#appQuickLogout", t("pages.account.quickLogout"));
    setText(".grid .card.panel-card:nth-of-type(1) .panel-title", t("pages.account.profile"));
    setText(".grid .card.panel-card:nth-of-type(1) .field:nth-of-type(1) label", t("pages.account.name"));
    setPlaceholder("#nameInp", t("pages.account.namePlaceholder"));
    setText(".grid .card.panel-card:nth-of-type(1) .field:nth-of-type(2) label", t("pages.account.email"));
    setText(".grid .card.panel-card:nth-of-type(1) .hint", t("pages.account.emailHint"));
    setText("#saveProfileBtn", t("pages.account.save"));
    setText("#reloadBtn", t("pages.account.refresh"));
    setText(".grid .card.panel-card:nth-of-type(2) .panel-title", t("pages.account.security"));
    setText(".grid .card.panel-card:nth-of-type(2) .field:nth-of-type(1) label", t("pages.account.currentPassword"));
    setText(".grid .card.panel-card:nth-of-type(2) .field:nth-of-type(2) label", t("pages.account.newPassword"));
    setText("#changePassBtn", t("pages.account.changePassword"));
    setText("#forgotPassBtn", t("pages.account.forgotPassword"));
    setPlaceholder("#verifyEmailInp", t("pages.account.emailSavePlaceholder"));
    setText("#sendVerifyBtn", t("pages.account.sendVerify"));
    setText("#saveEmailBtn", t("pages.account.saveEmail"));
    setText("#enablePushBtn", t("pages.account.enablePush"));
    setText("#disablePushBtn", t("pages.account.disablePush"));
    setText('#closeOtherSessionsBtn', t("pages.account.closeOtherSessions"));
    setText('.danger .panel-title', t("pages.account.dangerZone"));
    setText('.danger small', t("pages.account.dangerText"));
    setText('#deleteAccountBtn', t("pages.account.deleteAccount"));
    setText('#delModal h1', t("pages.account.confirm"));
    setText('#delModal .sub', t("pages.account.confirmText"));
    setText('#delCancel', t("pages.account.cancel"));
    setText('#delConfirm', t("pages.account.deleteForever"));

    var verifyCard = document.getElementById("verifyEmailInp");
    if (verifyCard) {
      var card = verifyCard.closest(".card");
      if (card) {
        var title = card.querySelector("h1");
        var sub = card.querySelector(".sub");
        var label = card.querySelector(".field label");
        var small = card.querySelector(".field small");
        if (title) title.textContent = t("pages.account.emailVerify");
        if (sub) sub.textContent = t("pages.account.emailVerifyText");
        if (label) label.textContent = t("pages.account.email");
        if (small) small.textContent = t("pages.account.emailSaveHint");
      }
    }

    var pushButton = document.getElementById("enablePushBtn");
    if (pushButton) {
      var pushCard = pushButton.closest(".card");
      if (pushCard) {
        var pushTitle = pushCard.querySelector("h1");
        var pushSub = pushCard.querySelector(".sub");
        if (pushTitle) pushTitle.textContent = t("pages.account.push");
        if (pushSub) pushSub.textContent = t("pages.account.pushText");
      }
    }

    var sessionsButton = document.getElementById("closeOtherSessionsBtn");
    if (sessionsButton) {
      var sessionsCard = sessionsButton.closest(".card");
      if (sessionsCard) {
        var sessionsTitle = sessionsCard.querySelector("h1");
        var sessionsSub = sessionsCard.querySelector(".sub");
        if (sessionsTitle) sessionsTitle.textContent = t("pages.account.sessions");
        if (sessionsSub) sessionsSub.textContent = t("pages.account.sessionsText");
      }
    }
  }

  function applyLogin() {
    setText(".auth-point:nth-of-type(1) strong", t("pages.login.feature1Title"));
    setText(".auth-point:nth-of-type(1) span", t("pages.login.feature1Text"));
    setText(".auth-point:nth-of-type(2) strong", t("pages.login.feature2Title"));
    setText(".auth-point:nth-of-type(2) span", t("pages.login.feature2Text"));
    setText(".auth-point:nth-of-type(3) strong", t("pages.login.feature3Title"));
    setText(".auth-point:nth-of-type(3) span", t("pages.login.feature3Text"));
    setText(".auth-point:nth-of-type(4) strong", t("pages.login.feature4Title"));
    setText(".auth-point:nth-of-type(4) span", t("pages.login.feature4Text"));
    setText(".back-home", t("pages.login.backHome"));
    setText(".login-container h2", t("pages.login.title"));
    setPlaceholder('input[name="login"]', t("pages.login.loginPlaceholder"));
    setPlaceholder('input[name="password"]', t("pages.login.passwordPlaceholder"));
    setText(".chk-text", t("pages.login.rememberMe"));
    setText(".link-chip[href*=\"registeruser.php\"]", t("pages.login.noAccount"));
    setText(".login-container button[type=\"submit\"]", t("pages.login.submit"));
    setText(".social-auth-sep", t("pages.login.continueWith"));
    setText(".social-auth-link-note", t("pages.login.socialReady"));
    setText(".links .link-chip", t("pages.login.forgotPassword"));
  }

  function applyRegister() {
    setText(".auth-point:nth-of-type(1) strong", t("pages.register.feature1Title"));
    setText(".auth-point:nth-of-type(1) span", t("pages.register.feature1Text"));
    setText(".auth-point:nth-of-type(2) strong", t("pages.register.feature2Title"));
    setText(".auth-point:nth-of-type(2) span", t("pages.register.feature2Text"));
    setText(".auth-point:nth-of-type(3) strong", t("pages.register.feature3Title"));
    setText(".auth-point:nth-of-type(3) span", t("pages.register.feature3Text"));
    setText(".auth-point:nth-of-type(4) strong", t("pages.register.feature4Title"));
    setText(".auth-point:nth-of-type(4) span", t("pages.register.feature4Text"));
    setText(".back-home", t("pages.register.backHome"));
    setText(".login-container h2", t("pages.register.title"));
    setPlaceholder('input[name="name"]', t("pages.register.namePlaceholder"));
    setPlaceholder('input[name="login"]', t("pages.register.loginPlaceholder"));
    setText(".login-container button[type=\"submit\"]", t("pages.register.submit"));
    setText(".link-chip[href*=\"loginuser.php\"]", t("pages.register.hasAccount"));
    setText(".social-auth-sep", t("pages.register.continueWith"));
    setText(".social-auth-link-note", t("pages.register.socialReady"));
  }

  function applySetlists() {
    updateMeta(t("pages.setlists.metaTitle"), t("pages.setlists.metaDescription"));
    setText(".page-kicker", t("pages.setlists.kicker"));
    setText(".page-title", t("pages.setlists.title"));
    setText(".page-copy", t("pages.setlists.text"));
    setText(".stat-card:nth-child(1) .stat-label", t("pages.setlists.totalSetlists"));
    setText(".stat-card:nth-child(2) .stat-label", t("pages.setlists.active"));
    setText(".stat-card:nth-child(3) .stat-label", t("pages.setlists.public"));
    setText(".stat-card:nth-child(4) .stat-label", t("pages.setlists.totalItems"));
    setText(".stat-card:nth-child(3) .stat-sub", t("pages.setlists.publicHint"));
    setText(".stat-card:nth-child(4) .stat-sub", t("pages.setlists.totalItemsHint"));
    setText(".mini-card:nth-of-type(1) .panel-title", t("pages.setlists.newSetlist"));
    setText(".mini-card:nth-of-type(1) .helper-copy", t("pages.setlists.newSetlistText"));
    setPlaceholder("#newSetlistName", t("pages.setlists.newSetlistPlaceholder"));
    setText("#createSetlistBtn", t("pages.setlists.create"));
    setText(".mini-card.search-tools .panel-title", t("pages.setlists.searchFilter"));
    setText(".mini-card.search-tools .helper-copy", t("pages.setlists.searchFilterText"));
    setPlaceholder("#setlistSearchInput", t("pages.setlists.searchPlaceholder"));
    setText('[data-setlist-filter="all"]', t("pages.setlists.filterAll"));
    setText('[data-setlist-filter="active"]', t("pages.setlists.filterActive"));
    setText('[data-setlist-filter="archived"]', t("pages.setlists.filterArchived"));
    setText('[data-setlist-filter="public"]', t("pages.setlists.filterPublic"));
    setText(".row .stack h3", t("pages.setlists.mySetlists"));
    setText(".row .stack .small", t("pages.setlists.latestFirst"));
    setText("#emptyState", t("pages.setlists.emptyState"));
    setText("#shareStatusBadge", t("pages.setlists.private"));
    setText("#openViewBtn .btn-text", t("pages.setlists.open"));
    setText("#shareBtn .btn-text", t("pages.setlists.share"));
    setText("#copyShareBtn .btn-text", t("pages.setlists.copyLink"));
    setText("#disableShareBtn .btn-text", t("pages.setlists.disableShare"));
    setText("#archiveBtnText", t("pages.setlists.archive"));
    setText("#duplicateBtn .btn-text", t("pages.setlists.duplicate"));
    setText("#deleteBtn .btn-text", t("pages.setlists.delete"));
    setText(".details-stats .detail-stat:nth-child(1) .small", t("pages.setlists.totalUnits"));
    setText(".details-stats .detail-stat:nth-child(2) .small", t("pages.setlists.songs"));
    setText(".details-stats .detail-stat:nth-child(3) .small", t("pages.setlists.sections"));
    setText(".details-stats .detail-stat:nth-child(4) .small", t("pages.setlists.requiredSongs"));
    setText("#saveSetlistMetaBtn", t("pages.setlists.saveMeta"));
    setText(".split .card:nth-child(1) h3", t("pages.setlists.addSong"));
    setPlaceholder("#songSearchInput", t("pages.setlists.songSearchPlaceholder"));
    setPlaceholder("#addSongTargetKey", t("pages.setlists.targetKeyPlaceholder"));
    setText(".split .card:nth-child(2) h3", t("pages.setlists.addSection"));
    setPlaceholder("#addSectionTitle", t("pages.setlists.sectionPlaceholder"));
    setText("#addSectionBtn", t("pages.setlists.addSectionButton"));
    setText(".row h3", t("pages.setlists.items"));
  }

  function applyNews() {
    updateMeta(t("pages.news.metaTitle"), t("pages.news.metaDescription"));
    setText("main h1, .page-header h1, h1", t("pages.news.title"));
  }

  function applySongView() {
    setText(".panel-title", t("pages.songView.transpose"));
  }

  function resolvePageKey() {
    var path = (window.location.pathname || "").toLowerCase();
    if (path === "/" || path === "/index.html") return "index";
    if (path === "/main.html") return "main";
    if (path === "/favorites.html") return "favorites";
    if (path === "/account.html") return "account";
    if (path === "/loginuser.php") return "login";
    if (path === "/registeruser.php") return "register";
    if (path === "/setlists.html") return "setlists";
    if (path === "/news.html") return "news";
    if (path === "/song_view.html") return "songView";
    return "";
  }

  function applyTranslations(lang) {
    lang = SUPPORTED.indexOf(lang) >= 0 ? lang : getLang();
    document.documentElement.lang = lang;
    applyCommonNav();
    injectSwitcher(lang);
    switch (resolvePageKey()) {
      case "index": applyIndex(); break;
      case "main": applyMain(); break;
      case "favorites": applyFavorites(); break;
      case "account": applyAccount(); break;
      case "login": applyLogin(); break;
      case "register": applyRegister(); break;
      case "setlists": applySetlists(); break;
      case "news": applyNews(); break;
      case "songView": applySongView(); break;
    }
  }

  window.wpI18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: applyTranslations
  };

  wrapFetchWithLang();

  document.addEventListener("DOMContentLoaded", function () {
    applyTranslations(getLang());
  });
})();
