
const gulp = require('gulp');
const browserSync = require('browser-sync').create();

config = {
    js: './src/js/**/*.js',
    css: './src/css/**/*.css',
    html: './src/**/*.html'
}

gulp.task('serve', () => {
    browserSync.init({
        server: {
            port: 3000,
            baseDir: './src'
        }
    });
    gulp.watch('./src/**/*').on('change', browserSync.reload);
});

gulp.task('default', ['serve']);
