(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (history "set_tetraplet")
        ["12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb" "65b7232f-45ff-464f-a804-c4c8ce563726" "is_authenticated" json_path] auth_result)
  (call %init_peer_id% (returnService "run") [auth_result])
     ))
