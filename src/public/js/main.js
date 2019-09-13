$('.navbar-toggler-icon').click(function() {
  $(this).toggleClass("navbar-toggle-close");
});

$('.share-btn').click(function(){
  $(this).addClass("clicked");
});

$('.close').click(function (e) {
  $('.clicked').removeClass('clicked');
  e.stopPropagation();
});