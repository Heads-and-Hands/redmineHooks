## Установка проекта
* npm install
* Копировать файл key.example.js с новым именем key.js
* Вписать в файл key.js ключ от редмайна и гитхаба

## Запуск
* npm start

## Адреса хуков
* Github: domain.url:8001/github
* Bitrise: domain.url:8001/bitrise?project={projectName}

## Запуск в контейнере

### Запуск для разработки
Из корневой папки запустить ```docker-compose up -d```

### Запуск на сервере
Скопировать один файл docker-compose.stage.yml на сервер под именем docker-compose.yml и запустить ```docker-compose up -d```