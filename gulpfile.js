const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const browserSync = require('browser-sync').create();

let apiServer = null;

config = {
    js: './src/js/**/*.js',
    css: './src/css/**/*.css',
    html: './src/**/*.html'
}

gulp.task('start:api', (cb) => {
    apiServer = nodemon({
        script: 'dev-server.js'
    });
    cb();
});

gulp.task('serve', (cb) => {
    browserSync.init({
        server: {
            port: 3005,
            baseDir: './src'
        }
    });
    gulp.watch('./src/**/*').on('change', browserSync.reload);
    cb();
});

process.on('exit', function () {
    // In case the gulp process is closed (e.g. by pressing [CTRL + C]) stop both processes
    apiServer.kill();
});

gulp.task('default', ['serve','start:api']);