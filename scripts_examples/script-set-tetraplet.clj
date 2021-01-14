(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (history "set_tetraplet")
        ["12D3KooWBUJifCTgaxAUrcM9JysqCcS4CS8tiYH5hExbdWCAoNwb" "d4506f7d-be4a-4332-87b2-eb530f350861" "is_authenticated" json_path] auth_result)
  (call %init_peer_id% (returnService "") [auth_result])
     ))
