module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            lintall: {
                src: ['src/backbone.flexisync.js', 'src/datastores/*.js']
            }
        },

        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['src/intro.js', 'src/datastores/*.js', 'src/main.js', 'src/outro.js'],
                dest: '<%= pkg.name %>.js'
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd") %>) */\n'
            },
            minify: {
                src: '<%= pkg.name %>.js',
                dest: '<%= pkg.name %>.min.js'
            }
        }
    });

    // Load plugins.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};