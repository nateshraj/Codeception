$(function () {
  var typeWriter = new TypeWriter('#typeWriter');
  typeWriter.start();
});

$('#resetPasswordModal').on('hidden.bs.modal', function () {
  $(this).find('#resetPasswordForm').trigger('reset');
})

$(document).ready(function () {
  $('#fullpage').fullpage({
    verticalCentered: false,
    responsiveWidth: 768,
    paddingTop: '3rem',
    scrollBar: true,
    // paddingBottom: '10px',
  });
});

// Works without this..not sure if this line below is required
// $('body').scrollspy({ target: '#mainNavbar' });

// console.log(<%= activeCard %>);
// $(<%= activeCard %>).attr('class', 'card-body tab-pane active');
