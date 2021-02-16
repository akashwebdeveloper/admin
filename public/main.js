$(document).ready(function () {


    // Admin login
    $('#loginAdmin').on('submit', function (e) {
        e.preventDefault();
        $('#errorHolder').hide();
        console.log('login');
        var formdata = new FormData(this);

        $.ajax({
            method: 'post',
            url: '/admin/login',
            data: formdata,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.status == 1) {
                    // SUCCESS
                    window.location.href = '/admin';
                } else {
                    // FAIL
                    $('#errorHolder').find('p').html(response.message);
                    $('#errorHolder').show();
                }
            },
            error: function (response) {
                $('#errorHolder').find('p').html("Something went wrong!");
                $('#errorHolder').show();
            }
        });
    });

    // Admin logout
    $('#logoutAdmin').on('click', function () {

        $.ajax({
            method: 'get',
            url: '/admin/logout',
            success: function (response) {
                if (response.status == 1) {
                    // SUCCESS
                    window.location.href = '/admin/login';
                } else {
                    // FAIL
                    console.log("ERROR logging out");
                }
            },
            error: function (response) {
                console.log("ERROR logging out");
            }
        });
    });


    //User status Change
    $(document).on('click','.activate',function(){
        var id = $(this).data('id');
        changeStatus(id,true);
    });
    $(document).on('click','.deactivate',function(){
        var id = $(this).data('id');
        changeStatus(id,false);
    });

    function changeStatus(id,status){

        var stat = status ? 'Activated' : 'Deactivated';

        $.ajax({
            method: 'post',
            url: '/admin/users/change_status',
            data: {'id':id,'status':status},
            success: function (response) {
                if (response.status == 1) {
                    // SUCCESS
                    console.log("STATUS UPDATED SUCCESSFULLY");
                    swal({
                        icon: 'success',
                        title: "User "+stat+" successfully",
                      }).then(function(){
                        window.location.reload();
                      });
                    // window.location.href = '/admin/users';
                } else {
                    // FAIL
                    swal({
                        icon: 'error',
                        title: response.message,
                      }).then(function(){
                        window.location.reload();
                      });
                }
            },
            error: function (err) {
                swal({
                    icon: 'error',
                    title: "Error occurred, Please try again.",
                  }).then(function(){
                    window.location.reload();
                  });
        }
        });
    }

    function formateDateandTime(date) {
		// 7/12/2018 12:25PM
		var dat = new Date(date);
		var mon = (dat.getMonth() + 1 > 9) ? dat.getMonth() + 1 : "0" + parseInt(dat.getMonth() + parseInt(1));


		var hours = dat.getHours() % 12;
		hours = (hours > 9) ? hours : "0" + hours;

		var minutes = dat.getMinutes();
		minutes = (minutes > 9) ? minutes : "0" + minutes;

		var ap = (dat.getHours() >= 12) ? "PM" : "AM";
		var day = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();

		rez = day + "/" + mon + "/" + dat.getFullYear() + " " + hours + ":" + minutes + ap;

		return rez;
    } 

    $('.time_formateDateandTime').each(function(){
        let dat = formateDateandTime(parseInt($(this).text())); //new Date(parseInt($(this).text()));
        $(this).text(dat);
    });

});